import { Component, useEffect, useRef } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import * as styles from './Oscilloscope.css'
import { ModuleInputs } from '../module-parts/ModuleSockets'
import { Oscilloscope } from '@modulate/worklets/src/modules'
import { isSocketOccupied } from '../../state'

type Props = {
  id: string
}

const HISTORY_LENGTH = 128 * 16 * 16
const SCOPE_WIDTH = 400
const SCOPE_HEIGHT = 400

class OscilloscopeNode extends Component<Props> {
  canvasRef = useRef<HTMLCanvasElement>()
  xBuffer: Float32Array | null = null
  yBuffer: Float32Array | null = null

  bothConnected = false

  constructor(props: Props) {
    super(props)

    engine.getModulePointers(props.id).then((pointers) => {
      this.xBuffer = engine.getMemorySlice(pointers[0]!, HISTORY_LENGTH)
      this.yBuffer = engine.getMemorySlice(pointers[1]!, HISTORY_LENGTH)
    })

    useEffect(() => {
      this.bothConnected =
        isSocketOccupied<Oscilloscope, 'input', 'x'>(props.id, 'input', 0) &&
        isSocketOccupied<Oscilloscope, 'input', 'y'>(props.id, 'input', 1)
    })

    useEffect(() => {
      if (this.canvasRef.current) {
        this.renderWaveform()
      }
    })
  }

  renderWaveform = () => {
    const canvas = this.canvasRef.current
    if (!canvas) {
      return
    }

    window.requestAnimationFrame(this.renderWaveform)

    if (!this.xBuffer || !this.yBuffer) {
      return
    }

    const context = canvas.getContext('2d')!
    const currentTime = Math.floor(
      engine.getAudioContext().currentTime * engine.getAudioContext().sampleRate
    )
    context.beginPath()
    context.clearRect(0, 0, SCOPE_WIDTH, SCOPE_HEIGHT)

    const scopeWidthInSamples = HISTORY_LENGTH / 4

    if (this.bothConnected) {
      for (let i = 0; i < scopeWidthInSamples; i++) {
        const sample = (currentTime + i + 128 * 64) % HISTORY_LENGTH
        let x = (this.xBuffer[sample]! * SCOPE_HEIGHT) / 2 + SCOPE_HEIGHT / 2
        let y = (this.yBuffer[sample]! * SCOPE_HEIGHT) / 2 + SCOPE_HEIGHT / 2

        if (i === 0) {
          context.moveTo(x, y)
        } else {
          context.lineTo(x, y)
        }
      }
    } else {
      for (let i = 0; i < scopeWidthInSamples; i++) {
        const sample = (currentTime + i + 128 * 64) % HISTORY_LENGTH
        let x = i * (SCOPE_WIDTH / scopeWidthInSamples)
        let y = (this.xBuffer[sample]! * SCOPE_HEIGHT) / 2 + SCOPE_HEIGHT / 2

        if (i === 0) {
          context.moveTo(x, y)
        } else {
          context.lineTo(x, y)
        }
      }
    }
    context.lineWidth = 2
    context.strokeStyle = '#e85d00'
    context.stroke()
  }

  render({ id }: Props) {
    return (
      <Module id={id} type="Oscilloscope">
        <div class={styles.oscilloscope}>
          <canvas
            ref={this.canvasRef}
            width={SCOPE_WIDTH}
            height={SCOPE_HEIGHT}
          ></canvas>
        </div>
        <ModuleInputs>
          <Socket<Oscilloscope, 'input', 'x'>
            moduleId={id}
            type="input"
            index={0}
            label="X"
          />
          <Socket<Oscilloscope, 'input', 'y'>
            moduleId={id}
            type="input"
            index={1}
            label="Y"
          />
        </ModuleInputs>
      </Module>
    )
  }
}

export default OscilloscopeNode
