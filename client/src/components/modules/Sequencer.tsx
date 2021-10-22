import { h, Component, useEffect } from 'kaiku'
import { IModule } from '../../types'
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
import { SequencerMessage } from '../../../../common/types'

function splitEvery<T>(arr: T[], num: number): T[][] {
  const res: T[][] = []

  for (let i = 0; i < arr.length; i++) {
    const mod = i % num
    if (mod === 0) {
      res.push([])
    }
    res[res.length - 1].push(arr[i])
  }

  return res
}

type Props = {
  id: string
}

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const
type NoteName = typeof NOTE_NAMES[number]

const OCTAVES = [1, 2, 3, 4, 5, 6, 7, 8, 9]

type Note = {
  index: number
  name: NoteName
  octave: number
  gate: boolean
}

type SequencerState = {
  sequenceLength: number
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

    const sendToSequencer = (message: SequencerMessage) => {
      this.node.port.postMessage(message)
    }

    if (!getModuleState<SequencerState>(props.id)) {
      setModuleState(props.id, {
        editing: 0,
        sequenceLength: 32,
        notes: Array(32)
          .fill(null)
          .map((_, index) => ({
            index,
            name: 'C',
            octave: 4,
            gate: true,
          })),
      })
    }

    useEffect(() => {
      const { notes } = getModuleState<SequencerState>(props.id)
      sendToSequencer({
        type: 'NOTES',
        notes: notes.map((note) => ({
          voltage:
            note.octave - 4 + (NOTE_NAMES.indexOf(note.name) * 1 - 9) / 12,
          gate: note.gate,
        })),
      })
    })

    useEffect(() => {
      const knobs = getModuleKnobs(props.id)

      if (knobs) {
        const { sequenceLength } = knobs
        getModuleState<SequencerState>(props.id).sequenceLength = sequenceLength
      }
    })

    useEffect(() => {
      const { sequenceLength } = getModuleState<SequencerState>(props.id)

      sendToSequencer({
        type: 'SEQUENCE_LENGTH',
        length: Math.ceil(sequenceLength),
      })
    })

    connectKnobToParam(
      this.props.id,
      'glide',
      this.node.parameters.get('glide')
    )
  }

  render({ id }: Props) {
    const moduleState = getModuleState<SequencerState>(id)
    const { editing, notes, sequenceLength } = moduleState

    const groupedNotes = splitEvery(splitEvery(notes, 4), 4)

    return (
      <Module id={id} name="Sequencer" width={340} height={200}>
        <div className={css('sequencer')}>
          <div className={css('steps')}>
            {groupedNotes.map((groups) => (
              <div className={css('row')}>
                {groups.map((group) => (
                  <div className={css('group')}>
                    {group.map((note) => (
                      <div
                        className={css('indicator', {
                          on: note.index === editing,
                          disabled: note.index >= sequenceLength,
                        })}
                        onClick={() => {
                          moduleState.editing = note.index
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className={css('middle')}>
            <Keyboard
              note={notes[editing].name}
              onChange={(note) => {
                notes[editing].name = note as NoteName
              }}
            />
            <Knob
              moduleId={id}
              name="sequenceLength"
              min={1}
              max={32}
              initial={32}
            />
            <Knob moduleId={id} name="glide" min={0} max={4} initial={0} />
          </div>
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
