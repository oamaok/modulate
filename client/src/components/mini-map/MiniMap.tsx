import { useEffect, useRef } from 'kaiku'
import state from '../../state'
import moduleConfig from '../../module-config'
import * as styles from './MiniMap.css'
import assert from '../../assert'
import { ModuleName } from '@modulate/worklets/src/modules'
import useDrag from '../../hooks/useDrag'

const MINIMAP_WIDTH = 200
const MINIMAP_HEIGHT = 120

const MINIMUM_MINIMAP_WIDTH = 3000
const MINIMUM_MINIMAP_HEIGHT =
  MINIMUM_MINIMAP_WIDTH * (MINIMAP_HEIGHT / MINIMAP_WIDTH)

const PADDING = 200

type AABB = {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

const getPatchBoundingBox = (): AABB => {
  const patchBoundingBox: AABB = {
    minX: -MINIMUM_MINIMAP_WIDTH / 2,
    minY: -MINIMUM_MINIMAP_HEIGHT / 2,
    maxX: MINIMUM_MINIMAP_WIDTH / 2,
    maxY: MINIMUM_MINIMAP_HEIGHT / 2,
    width: 0,
    height: 0,
  }

  for (const moduleId in state.patch.modules) {
    const module = state.patch.modules[moduleId]
    assert(module)
    const moduleName = module.name as ModuleName

    patchBoundingBox.minX = Math.min(patchBoundingBox.minX, module.position.x)
    patchBoundingBox.minY = Math.min(patchBoundingBox.minY, module.position.y)
    patchBoundingBox.maxX = Math.max(
      patchBoundingBox.maxX,
      module.position.x + moduleConfig[moduleName].width
    )
    patchBoundingBox.maxY = Math.max(
      patchBoundingBox.maxY,
      module.position.y + moduleConfig[moduleName].height
    )
  }

  patchBoundingBox.minX -= PADDING
  patchBoundingBox.minY -= PADDING
  patchBoundingBox.maxX += PADDING
  patchBoundingBox.maxY += PADDING

  patchBoundingBox.width = patchBoundingBox.maxX - patchBoundingBox.minX
  patchBoundingBox.height = patchBoundingBox.maxY - patchBoundingBox.minY

  const scaleX = MINIMAP_WIDTH / patchBoundingBox.width
  const scaleY = MINIMAP_HEIGHT / patchBoundingBox.height

  if (scaleX > scaleY) {
    const extraPad = (patchBoundingBox.width * (scaleX / scaleY - 1)) / 2
    patchBoundingBox.minX -= extraPad
    patchBoundingBox.maxX += extraPad
    patchBoundingBox.width += extraPad * 2
  } else {
    const extraPad = (patchBoundingBox.height * (scaleY / scaleX - 1)) / 2
    patchBoundingBox.minY -= extraPad
    patchBoundingBox.maxY += extraPad
    patchBoundingBox.height += extraPad * 2
  }

  return patchBoundingBox
}

const MiniMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>()

  useDrag({
    ref: canvasRef,
    onDragStart({ relativeX, relativeY }) {
      const patchBoundingBox = getPatchBoundingBox()
      const scale = patchBoundingBox.width / MINIMAP_WIDTH

      state.viewOffset.x =
        -relativeX * scale - patchBoundingBox.minX + state.viewport.width / 2
      state.viewOffset.y =
        -relativeY * scale - patchBoundingBox.minY + state.viewport.height / 2

      canvasRef.current?.classList.add(styles.dragging)
    },
    onDrag({ deltaX, deltaY }) {
      const patchBoundingBox = getPatchBoundingBox()
      const scale = patchBoundingBox.width / MINIMAP_WIDTH

      state.viewOffset.x += deltaX * scale
      state.viewOffset.y += deltaY * scale
    },
    onDragEnd() {
      canvasRef.current?.classList.remove(styles.dragging)
    },
  })

  useEffect(() => {
    if (!canvasRef.current) return
    const context = canvasRef.current.getContext('2d')
    assert(context)

    context.resetTransform()
    context.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT)

    const patchBoundingBox = getPatchBoundingBox()
    const scale = MINIMAP_WIDTH / patchBoundingBox.width

    context.scale(scale, scale)
    context.translate(-patchBoundingBox.minX, -patchBoundingBox.minY)
    context.lineWidth = 1.5 / scale

    for (const moduleId in state.patch.modules) {
      const module = state.patch.modules[moduleId]
      assert(module)
      const moduleName = module.name as ModuleName
      const config = moduleConfig[moduleName]

      context.fillStyle = config.colors.darker
      context.fillRect(
        module.position.x,
        module.position.y,
        config.width,
        config.height
      )

      context.strokeStyle = config.colors.primary
      context.strokeRect(
        module.position.x,
        module.position.y,
        config.width,
        config.height
      )
    }

    context.fillStyle = 'rgba(40, 40, 40, 0.5)'
    {
      const x = -state.viewOffset.x
      const y = -state.viewOffset.y
      const w = patchBoundingBox.maxX - x
      const h = patchBoundingBox.minY - y
      context.fillRect(x, y, w, h)
    }
    {
      const x = -state.viewOffset.x + state.viewport.width
      const y = -state.viewOffset.y
      const w = patchBoundingBox.maxX - x
      const h = patchBoundingBox.maxY - y
      context.fillRect(x, y, w, h)
    }
    {
      const x = -state.viewOffset.x + state.viewport.width
      const y = -state.viewOffset.y + state.viewport.height
      const w = patchBoundingBox.minX - x
      const h = patchBoundingBox.maxY - y
      context.fillRect(x, y, w, h)
    }
    {
      const x = -state.viewOffset.x
      const y = -state.viewOffset.y + state.viewport.height
      const w = patchBoundingBox.minX - x
      const h = patchBoundingBox.minY - y
      context.fillRect(x, y, w, h)
    }

    context.strokeStyle = '#ccc'
    context.strokeRect(
      -state.viewOffset.x,
      -state.viewOffset.y,
      state.viewport.width,
      state.viewport.height
    )
  })

  return (
    <canvas
      class={styles.minimap}
      ref={canvasRef}
      width={MINIMAP_WIDTH}
      height={MINIMAP_HEIGHT}
    />
  )
}

export default MiniMap
