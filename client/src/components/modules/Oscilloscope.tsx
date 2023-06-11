import { h, Component } from 'kaiku'
import { getAudioContext } from '../../engine'
import { getKnobValue } from '../../state'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import css from './Oscilloscope.css'

type Props = {
  id: string
}

const QUANTUM_SIZE = 128
const LENGTH = 64

class Oscilloscope extends Component<Props> {
  node: AudioWorkletNode
  buffer: Float32Array

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()
    this.node = new AudioWorkletNode(audioContext, 'Oscilloscope', {
      numberOfInputs: 1,
    })

    const sharedBuffer = new SharedArrayBuffer(QUANTUM_SIZE * LENGTH * 4 + 4)
    this.buffer = new Float32Array(sharedBuffer)

    this.node.port.postMessage(sharedBuffer)

    this.updateCanvas()
  }

  updateCanvas = () => {
    window.requestAnimationFrame(this.updateCanvas)
    const canvas = document.querySelector('canvas')
    if (!canvas) return

    const context = canvas.getContext('2d')!

    const len = QUANTUM_SIZE * LENGTH
    const offset = (this.buffer[this.buffer.length - 1]! + 128) % len

    context.fillStyle = `rgba(10, 10, 10, 0.5)`
    context.strokeStyle = '#00d115'
    context.fillRect(0, 0, 200, 200)
    context.beginPath()
    context.moveTo(0, this.buffer[offset]! * 100 + 100)
    context.lineWidth = 1

    for (let i = 1; i < len; i += 20) {
      context.lineTo(
        (200 / len) * i,
        -this.buffer[(offset + i) % len]! *
          100 *
          getKnobValue(this.props.id, 'scale')! +
          100
      )
    }

    context.stroke()
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Oscilloscope" width={240} height={260}>
        <canvas
          className={css('canvas')}
          id="canvas"
          width="200"
          height="200"
        />
        <Knob
          moduleId={id}
          id="scale"
          type="linear"
          min={0.01}
          max={2}
          initial={1}
        />
        <ModuleInputs>
          <Socket moduleId={id} type="input" name="in" node={this.node} />
        </ModuleInputs>
        <ModuleOutputs></ModuleOutputs>
      </Module>
    )
  }
}

export default Oscilloscope
