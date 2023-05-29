import { h, Component, useEffect } from 'kaiku'
import * as util from '@modulate/common/util'
import { IModule } from '../../types'
import { getAudioContext } from '../../audio'
import { WorkletNode } from '../../worklets'
import { getModuleKnobs, getModuleState, setModuleState } from '../../state'
import { connectKnobToParam } from '../../modules'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import css from './Sequencer.css'

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import Keyboard from '../module-parts/Keyboard'
import { SequencerMessage } from '@modulate/common/types'
import assert from '../../assert'

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
type NoteName = (typeof NOTE_NAMES)[number]

const OCTAVES = [8, 7, 6, 5, 4, 3, 2]

type Note = {
  index: number
  name: NoteName
  octave: number
  gate: boolean
  glide: boolean
}

type SequencerState = {
  sequenceLength: number
  editing: number
  notes: Note[]
}

class Sequencer
  extends Component<
    Props,
    {
      currentStep: number
    }
  >
  implements IModule
{
  node: WorkletNode<'Sequencer'>

  state = {
    currentStep: 0,
  }

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()

    this.node = new WorkletNode(audioContext, 'Sequencer', {
      numberOfOutputs: 2,
    })

    const sendToSequencer = (message: SequencerMessage) => {
      this.node.port.postMessage(message)
    }

    this.node.port.onmessage = (message) => {
      switch (message.data.type) {
        case 'CURRENT_STEP': {
          this.state.currentStep = message.data.step
          break
        }
      }
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
            glide: false,
          })),
      })
    }

    useEffect(() => {
      const { notes } = getModuleState<SequencerState>(props.id)
      sendToSequencer({
        type: 'SET_NOTES',
        notes: notes.map((note) => ({
          voltage:
            note.octave - 4 + (NOTE_NAMES.indexOf(note.name) * 1 - 9) / 12,
          gate: note.gate,
          glide: note.glide,
        })),
      })
    })

    useEffect(() => {
      const knobs = getModuleKnobs(props.id)

      if (knobs) {
        const { sequenceLength } = knobs
        assert(typeof sequenceLength !== 'undefined')

        getModuleState<SequencerState>(props.id).sequenceLength = sequenceLength
      }
    })

    connectKnobToParam(
      this.props.id,
      'glide',
      this.node.parameters.get('glide')
    )

    connectKnobToParam(
      this.props.id,
      'sequenceLength',
      this.node.parameters.get('sequenceLength')
    )
  }

  render({ id }: Props) {
    const moduleState = getModuleState<SequencerState>(id)
    const { editing, notes, sequenceLength } = moduleState

    const groupedNotes = util.splitEvery(util.splitEvery(notes, 4), 4)

    return (
      <Module id={id} name="Sequencer" width={340} height={200}>
        <div className={css('sequencer')}>
          <div className={css('steps')}>
            {groupedNotes.map((groups) => (
              <div className={css('row')}>
                {groups.map((group) => (
                  <div className={css('group')}>
                    {group.map((note) => (
                      <button
                        className={css('indicator', {
                          on: note.index === editing,
                          current: note.index === this.state.currentStep,
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
            <div className={css('octaves')}>
              {OCTAVES.map((oct) => (
                <button
                  onClick={() => {
                    notes[editing]!.octave = oct
                  }}
                  className={css('indicator', {
                    on: notes[editing]!.octave === oct,
                  })}
                />
              ))}
            </div>
            <Keyboard
              note={notes[editing]!.name}
              onChange={(note) => {
                notes[editing]!.name = note as NoteName
              }}
            />
            <Knob
              moduleId={id}
              id="sequenceLength"
              type="stepped"
              step={1}
              min={1}
              max={32}
              initial={32}
              label="LEN"
            />
            <Knob
              moduleId={id}
              id="glide"
              type="exponential"
              exponent={2}
              min={0}
              max={1}
              initial={0}
              label="GLIDE"
            />
          </div>
          <div className={css('note-controls')}>
            Gate
            <button
              className={css('indicator', {
                on: notes[editing]!.gate,
              })}
              onClick={() => {
                notes[editing]!.gate = !notes[editing]!.gate
              }}
            />
            Glide
            <button
              className={css('indicator', {
                on: notes[editing]!.glide,
              })}
              onClick={() => {
                notes[editing]!.glide = !notes[editing]!.glide
              }}
            />
          </div>
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
