import { h, Component, useEffect } from 'kaiku'
import { IModule } from '../../types'
import { getAudioContext } from '../../audio'
import { WorkletNode } from '../../worklets'
import { getKnobValue, getModuleKnobs } from '../../state'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import classNames from 'classnames/bind'
import styles from './UtilityBox.css'

const css = classNames.bind(styles)

const QUANTUM_SIZE = 128
const LENGTH = 128
const WIDTH = 300

class UtilityBox extends Component {
  static node: AudioWorkletNode
  static buffer: Float32Array

  constructor() {
    super({})

    if (UtilityBox.node) {
      throw new Error('More than one utility box initialized')
    }

    const audioContext = getAudioContext()
    UtilityBox.node = new AudioWorkletNode(audioContext, 'Oscilloscope', {
      numberOfInputs: 1,
    })

    const sharedBuffer = new SharedArrayBuffer(QUANTUM_SIZE * LENGTH * 4 + 4)
    UtilityBox.buffer = new Float32Array(sharedBuffer)

    UtilityBox.node.port.postMessage(sharedBuffer)

    this.updateCanvas()
  }

  updateCanvas = () => {
    window.requestAnimationFrame(this.updateCanvas)
    const canvas = document.querySelector('canvas')
    if (!canvas) return

    const context = canvas.getContext('2d')!

    const len = QUANTUM_SIZE * LENGTH
    const offset = (UtilityBox.buffer[UtilityBox.buffer.length - 1] + 128) % len

    const scale = getKnobValue('utility-box', 'scale')!
    const length = getKnobValue('utility-box', 'length')!
    const yOffset = getKnobValue('utility-box', 'y-offset')! * 100 + 100

    context.fillStyle = '#000000'
    context.fillRect(0, 0, WIDTH, 200)

    context.strokeStyle = '#222222'
    context.beginPath()
    context.moveTo(0, yOffset)
    context.lineTo(WIDTH, yOffset)
    context.stroke()

    const startOffset = len - ~~(len * length)

    context.strokeStyle = '#e85d00'
    context.beginPath()
    context.moveTo(
      0,
      -UtilityBox.buffer[offset + startOffset] * 100 * scale + yOffset
    )
    context.lineWidth = 2

    for (let i = 1 + startOffset; i < len; i++) {
      const sample = UtilityBox.buffer[(offset + i) % len]

      context.lineTo(
        (WIDTH / (len * length)) * (i - startOffset),
        -sample * 100 * scale + yOffset
      )
    }

    context.stroke()
  }

  render() {
    return (
      <div className={css('utility-box')}>
        <div className={css('controls')}>
          <Knob
            moduleId="utility-box"
            id="scale"
            type="linear"
            min={0.01}
            max={2}
            initial={0.5}
            label="Scale"
          />
          <Knob
            moduleId="utility-box"
            id="length"
            type="linear"
            min={0.01}
            max={1}
            initial={1}
            label="Window"
          />
          <Knob
            moduleId="utility-box"
            id="y-offset"
            type="linear"
            min={-1}
            max={1}
            initial={0}
            label="Y-Offset"
          />
        </div>
        <canvas
          className={css('canvas')}
          id="canvas"
          width={WIDTH}
          height="200"
        />
      </div>
    )
  }
}

export default UtilityBox
