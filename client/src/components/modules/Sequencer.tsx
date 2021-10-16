import { h, Component, useEffect } from 'kaiku'
import { IModule, Id } from '../../types'
import { getAudioContext } from '../../audio'
import { WorkletNode } from '../../worklets'
import { getModuleKnobs, getModuleState, setModuleState } from '../../state'
import { connectKnobToParam } from '../../modules'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
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
  enabled: boolean
}

type SequencerState = {
  notes: Note[]
}

const initialState: SequencerState = {
  notes: Array(16)
    .fill(null)
    .map(() => ({
      name: 'A',
      octave: 4,
      enabled: true,
    })),
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
      setModuleState(props.id, initialState)
    }

    useEffect(() => {
      const { notes } = getModuleState<SequencerState>(props.id)
      this.node.port.postMessage(
        notes.map((note) => ({
          voltage: note.octave + (NOTE_NAMES.indexOf(note.name) * 1) / 12,
          gate: note.enabled,
        }))
      )
    })
  }

  render({ id }: Props) {
    const { notes } = getModuleState<SequencerState>(id)

    return (
      <Module id={id} name="Sequencer" width={460}>
        {notes.map((note) => (
          <div className="sequencer-note">
            <select
              onChange={(evt: any) => (note.name = evt.target.value)}
              value={note.name}
            >
              {NOTE_NAMES.map((name) => (
                <option selected={note.name === name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <select onChange={(evt: any) => (note.octave = +evt.target.value)}>
              {OCTAVES.map((oct) => (
                <option selected={note.octave === +oct} value={oct}>
                  {oct}
                </option>
              ))}
            </select>
          </div>
        ))}
        <ModuleInputs>
          <Socket moduleId={id} type="input" name="gate" node={this.node} />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket moduleId={id} type="output" name="out" node={this.node} />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default Sequencer
