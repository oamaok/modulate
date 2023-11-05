import { Component, useEffect, useRef } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { connectKnobToParam } from '../../modules'
import Knob from '../module-parts/Knob'
import { PianoRoll } from '@modulate/worklets/src/modules'
import { PianoRollNote } from '../piano-roll-editor/PianoRollEditor'
import state, {
  getModuleKnobs,
  getModuleState,
  setModuleState,
} from '../../state'
import css from './PianoRoll.css'
import assert from '../../assert'
import moduleConfig from '../../module-config'
type Props = {
  id: string
}

type PianoRollState = {
  notes: PianoRollNote[]
}

type State = {
  position: number
}

const BAR_LENGTH = 2 * 2 * 3 * 4 * 5

class PianoRollModule extends Component<Props, State> {
  canvasRef = useRef<HTMLCanvasElement>()
  positionBuf: Float32Array | null = null

  state: State = {
    position: 0,
  }

  constructor(props: Props) {
    super(props)
    if (!getModuleState<PianoRollState>(props.id)) {
      setModuleState<PianoRollState>(props.id, {
        notes: [],
      })
    }

    engine.createModule(props.id, 'PianoRoll')

    engine.onModuleEvent<PianoRoll>(props.id, ({ type, position }) => {
      if (type !== 'PianoRollPointers') {
        throw new Error(`PianoRoll: invalid message type ${type}`)
      }

      console.log('received ptr')

      this.positionBuf = engine.getMemorySlice(position, 1)
    })

    connectKnobToParam<PianoRoll, 'length'>(this.props.id, 'length', 0)
    connectKnobToParam<PianoRoll, 'speed'>(this.props.id, 'speed', 1)

    useEffect(() => {
      const timeout = setInterval(() => {
        if (this.positionBuf) {
          this.state.position = this.positionBuf[0]!
        }
      }, 16)

      return () => clearInterval(timeout)
    })

    useEffect(() => {
      if (!this.canvasRef.current) return
      this.renderPreview()
    })

    useEffect(() => {
      const { notes } = getModuleState<PianoRollState>(props.id)
      engine.sendMessageToModule<PianoRoll>(props.id, {
        type: 'PianoRollSetNotes',
        notes,
      })
    })
  }

  renderPreview = () => {
    const canvas = this.canvasRef.current
    assert(canvas)

    const wrapper = canvas.parentElement
    assert(wrapper)

    const { width, height } = wrapper.getBoundingClientRect()
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    assert(context)

    context.fillStyle = '#111'
    context.fillRect(0, 0, width, height)

    const { notes } = getModuleState<PianoRollState>(this.props.id)
    const knobs = getModuleKnobs(this.props.id)
    assert(knobs)
    assert(typeof knobs.length !== 'undefined')

    let highestPitch = -Infinity
    let lowestPitch = Infinity
    for (const note of notes) {
      if (highestPitch < note.pitch) {
        highestPitch = note.pitch
      }
      if (lowestPitch > note.pitch) {
        lowestPitch = note.pitch
      }
    }

    const pitchRange = highestPitch - lowestPitch + 7
    const pitchScale = height / pitchRange
    const timeScale = width / ((knobs.length * BAR_LENGTH) / 4)

    context.fillStyle = moduleConfig.PianoRoll.colors.lighter
    for (const note of notes) {
      const x = note.start * timeScale
      const w = note.length * timeScale
      const y = (highestPitch - note.pitch + 3) * pitchScale
      const h = pitchScale
      context.fillRect(x, y, w, h)
    }

    context.fillStyle = moduleConfig.PianoRoll.colors.dark
    context.fillRect(this.state.position * timeScale, 0, 2, height)
  }

  render({ id }: Props) {
    return (
      <Module id={id} type="PianoRoll" name="Piano Roll">
        <div className={css('piano-roll')}>
          <div className={css('knobs')}>
            <Knob
              moduleId={id}
              id="speed"
              label="SPEED"
              type="linear"
              min={0}
              max={10}
              initial={1}
            />
            <Knob
              moduleId={id}
              id="length"
              label="LENGTH"
              type="stepped"
              min={1}
              max={4 * 16}
              step={1}
              initial={4}
            />
          </div>
          <div
            className={css('preview')}
            onClick={() => {
              state.activePianoRollModuleId = id
            }}
          >
            <canvas ref={this.canvasRef} />
          </div>
        </div>
        <ModuleInputs>
          {/*
          <Socket<PianoRoll, 'input', 'externalClock'>
              moduleId={id}
              type="input"
              index={0}
              label="EXT CLOCK"
            />
        */}
          <Socket<PianoRoll, 'parameter', 'length'>
            moduleId={id}
            type="parameter"
            index={0}
            label="LEN"
          />
          <Socket<PianoRoll, 'parameter', 'speed'>
            moduleId={id}
            type="parameter"
            index={1}
            label="SPD"
          />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket<PianoRoll, 'output', 'gate'>
            moduleId={id}
            type="output"
            label="GATE"
            index={1}
          />
          <Socket<PianoRoll, 'output', 'cv'>
            moduleId={id}
            type="output"
            label="CV"
            index={0}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default PianoRollModule
