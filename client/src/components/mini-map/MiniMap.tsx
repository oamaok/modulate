import { useRef, useEffect } from 'kaiku'
import state from '../../state'
import moduleConfig from '../../module-config'
import css from './MiniMap.css'
import assert from '../../assert'
import { ModuleName } from '@modulate/worklets/src/modules'

const WIDTH = 200
const HEIGHT = 120

const PADDING = 50

const MiniMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>()

  useEffect(() => {
    if (!canvasRef.current) return
    const context = canvasRef.current.getContext('2d')
    assert(context)

    context.resetTransform()
    context.clearRect(0, 0, WIDTH, HEIGHT)

    const patchBoundingBox = {
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

    const minimapWidth =
      patchBoundingBox.maxX - patchBoundingBox.minX + PADDING * 2
    const minimapHeight =
      patchBoundingBox.maxY - patchBoundingBox.minY + PADDING * 2

    const scale = Math.min(WIDTH / minimapWidth, HEIGHT / minimapHeight)

    context.scale(scale, scale)
    context.translate(
      -patchBoundingBox.minX + PADDING,
      -patchBoundingBox.minY + PADDING
    )
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

    context.fillStyle = 'rgba(0, 0, 0, 0.5)'
    context.fillRect(
      -state.viewOffset.x,
      -state.viewOffset.y,
      minimapWidth,
      -minimapHeight
    )
    context.fillRect(
      -state.viewOffset.x,
      -state.viewOffset.y + state.viewport.height,
      -minimapWidth,
      -minimapWidth
    )
    context.fillRect(
      -state.viewOffset.x + state.viewport.width,
      -state.viewOffset.y,
      minimapWidth,
      minimapWidth
    )
    context.fillRect(
      -state.viewOffset.x + state.viewport.width,
      -state.viewOffset.y + state.viewport.height,
      -minimapWidth,
      minimapWidth
    )
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
