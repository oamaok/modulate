import { h, Component, useEffect } from 'kaiku'
import { IModule, Id } from '../../types'
import { getAudioContext } from '../../audio'
import { WorkletNode } from '../../worklets'
import { getModuleKnobs, getModuleState, setModuleState } from '../../state'
import { connectKnobToParam } from '../../modules'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import classNames from 'classnames/bind'
import styles from './Sequencer.css'

const css = classNames.bind(styles)

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import Keyboard from '../module-parts/Keyboard'
type Props = {
  id: Id
}

const NOTE_NAMES = [
  'A',
  'A#',
  'B',
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
] as const
type NoteName = typeof NOTE_NAMES[number]

const OCTAVES = [1, 2, 3, 4, 5, 6, 7, 8, 9]

type Note = {
  name: NoteName
  octave: number
  gate: boolean
}

type SequencerState = {
  editing: number
  notes: Note[]
}

class Sequencer extends Component<Props> implements IModule {
  node: WorkletNode<'Sequencer'>

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()

    this.node = new WorkletNode(audioContext, 'Sequencer', {
      numberOfOutputs: 2,
    })

    if (!getModuleState<SequencerState>(props.id)) {
      setModuleState(props.id, {
        editing: 0,
        notes: Array(16)
          .fill(null)
          .map(() => ({
            name: 'A',
            octave: 4,
            gate: true,
          })),
      })
    }

    useEffect(() => {
      const { notes } = getModuleState<SequencerState>(props.id)
      this.node.port.postMessage(
        notes.map((note) => ({
          voltage: note.octave + (NOTE_NAMES.indexOf(note.name) * 1) / 12,
          gate: note.gate,
        }))
      )
    })
  }

  render({ id }: Props) {
    const moduleState = getModuleState<SequencerState>(id)
    const { editing, notes } = moduleState

    return (
      <Module id={id} name="Sequencer" width={300} height={200}>
        <div className={css('sequencer')}>
          <div className={css('steps')}>
            {notes.map((_, i) => (
              <div
                className={css('indicator', {
                  on: i === editing,
                })}
                onClick={() => {
                  moduleState.editing = i
                }}
              ></div>
            ))}
          </div>
          <Keyboard
            note={notes[editing].name}
            onChange={(note) => {
              notes[editing].name = note as NoteName
            }}
          />
          Gate
          <div
            className={css('indicator', {
              on: notes[editing].gate,
            })}
            onClick={() => {
              notes[editing].gate = !notes[editing].gate
            }}
          ></div>
        </div>
        <ModuleInputs>
          <Socket moduleId={id} type="input" name="Gate" node={this.node} />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket
            moduleId={id}
            type="output"
            name="CV"
            node={this.node}
            output={0}
          />
          <Socket
            moduleId={id}
            type="output"
            name="Out Gate"
            node={this.node}
            output={1}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default Sequencer
