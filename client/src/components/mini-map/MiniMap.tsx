import { useEffect } from 'kaiku'
import state from '../../state'
import moduleConfig from '../../module-config'
import css from './MiniMap.css'
import assert from '../../assert'
import { ModuleName } from '@modulate/worklets/src/modules'
import useDrag from '../../hooks'

const WIDTH = 200
const HEIGHT = 120

const PADDING = 200

type AABB = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const getPatchBoundingBox = (): AABB => {
  const patchBoundingBox: AABB = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
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

  const minimapWidth = patchBoundingBox.maxX - patchBoundingBox.minX
  const minimapHeight = patchBoundingBox.maxY - patchBoundingBox.minY

  const scaleX = WIDTH / minimapWidth
  const scaleY = HEIGHT / minimapHeight

  if (scaleX > scaleY) {
    const extraPad = (minimapWidth * (scaleX / scaleY - 1)) / 2
    patchBoundingBox.minX -= extraPad
    patchBoundingBox.maxX += extraPad
  } else {
    const extraPad = (minimapHeight * (scaleY / scaleX - 1)) / 2
    patchBoundingBox.minY -= extraPad
    patchBoundingBox.maxY += extraPad
  }

  return patchBoundingBox
}

const MiniMap = () => {
  const canvasRef = useDrag<HTMLCanvasElement>({
    onMove({ dx, dy }) {
      const patchBoundingBox = getPatchBoundingBox()
      const scale = WIDTH / (patchBoundingBox.maxX - patchBoundingBox.minX)

      state.viewOffset.x += dx / scale
      state.viewOffset.y += dy / scale
    },
  })

  useEffect(() => {
    if (!canvasRef.current) return
    const context = canvasRef.current.getContext('2d')
    assert(context)

    context.resetTransform()
    context.clearRect(0, 0, WIDTH, HEIGHT)

    const patchBoundingBox = getPatchBoundingBox()
    const scale = WIDTH / (patchBoundingBox.maxX - patchBoundingBox.minX)

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
      className={css('minimap')}
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
    />
  )
}

export default MiniMap
