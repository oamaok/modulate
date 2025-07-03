import { useEffect, useRef } from 'kaiku'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { Sideq } from '@modulate/worklets/src/modules'
import useModulePointers from '../../hooks/useModulePointers'
import * as engine from '../../engine'
import assert from '../../assert'

type Props = {
  id: string
}

const FFT_SIZE = 8192 / 2
const SAMPLE_RATE = 44100
const log = (num: number, base: number) => Math.log(num) / Math.log(base)

const WIDTH = 200

const SideqNode = ({ id }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>()
  const modulePointersRef = useModulePointers(id)

  useEffect(() => {
    const canvas = canvasRef.current
    const pointers = modulePointersRef.current
    if (!canvas || !pointers) return

    const bufferPtr = pointers[0]!

    const context = canvas.getContext('2d')
    assert(context)
    const buffer = engine.getMemorySlice(bufferPtr, 1024 * 2)

    console.log(bufferPtr)

    const render = () => {
      context.fillStyle = '#000'
      context.fillRect(0, 0, WIDTH, 100)
      context.fillStyle = '#fff'
      for (let i = 1; i < FFT_SIZE; i++) {
        const freq = i * (SAMPLE_RATE / 2 / FFT_SIZE)
        const bucket = buffer[i]!

        /*
        const base = 2
        const sample = log((i / 300) * base + 1, base) * (FFT_SIZE - 1)
        const a = buffer[Math.floor(sample)]!
        const b = buffer[Math.ceil(sample)]!
        const fract = sample % 1
        const point = a * (1 - fract) + b * fract
        */

        const x = (Math.log(freq) / Math.log(SAMPLE_RATE)) * WIDTH
        const y = 100 - bucket
        context.fillRect(x, y, 1, 1)
      }

      animationFrame = requestAnimationFrame(render)
    }

    let animationFrame = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animationFrame)
  })

  return (
    <Module id={id} type="Sideq">
      <canvas ref={canvasRef} width={WIDTH} height="100"></canvas>
      <ModuleInputs>
        <Socket<Sideq, 'input', 'input'>
          moduleId={id}
          type="input"
          index={0}
          label="IN"
        />
      </ModuleInputs>
      <ModuleOutputs>
        <Socket<Sideq, 'output', 'output'>
          moduleId={id}
          type="output"
          index={0}
          label="OUT"
        />
      </ModuleOutputs>
    </Module>
  )
}

export default SideqNode
