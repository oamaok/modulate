import { h, Component, useEffect } from 'kaiku'
import * as util from '@modulate/common/util'
import { NoteName, Note } from '@modulate/common/types'
import { Sequencer } from '@modulate/worklets/src/modules'
import * as engine from '../../engine'
import { WorkletNode } from '../../worklets'
import { getKnobValue, getModuleState, setModuleState } from '../../state'
import { connectKnobToParam } from '../../modules'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import css from './Sequencer.css'

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import Keyboard from '../module-parts/Keyboard'

type Props = {
  id: string
}

const OCTAVES = [8, 7, 6, 5, 4, 3, 2]

type SequencerState = {
  notes: Note[]
}

class SequencerNode extends Component<
  Props,
  {
    currentStep: number
    editing: number
  }
> {
  node: WorkletNode<'Sequencer'>

  state = {
    currentStep: 0,
    editing: 0,
  }

  constructor(props: Props) {
    super(props)
    engine.createModule(props.id, 'Sequencer')

    engine.onModuleEvent<Sequencer>(props.id, ({ position }) => {
      this.state.currentStep = position
    })

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
      engine.sendMessageToModule<Sequencer>(props.id, {
        type: 'SequencerSetNotes',
        notes,
      })
    })

    connectKnobToParam<Sequencer, 'length'>(this.props.id, 'sequenceLength', 0)

    connectKnobToParam<Sequencer, 'glide'>(this.props.id, 'glide', 1)
  }

  render({ id }: Props) {
    const moduleState = getModuleState<SequencerState>(id)
    const { notes } = moduleState

    const groupedNotes = util.splitEvery(util.splitEvery(notes, 4), 4)
    const sequenceLength = getKnobValue(id, 'sequenceLength') ?? 32

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
                          on: note.index === this.state.editing,
                          current: note.index === this.state.currentStep,
                          disabled: note.index >= sequenceLength,
                        })}
                        onClick={() => {
                          this.state.editing = note.index
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
                    notes[this.state.editing]!.octave = oct
                  }}
                  className={css('indicator', {
                    on: notes[this.state.editing]!.octave === oct,
                  })}
                />
              ))}
            </div>
            <Keyboard
              note={notes[this.state.editing]!.name}
              onChange={(note) => {
                notes[this.state.editing]!.name = note as NoteName
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
                on: notes[this.state.editing]!.gate,
              })}
              onClick={() => {
                notes[this.state.editing]!.gate =
                  !notes[this.state.editing]!.gate
              }}
            />
            Glide
            <button
              className={css('indicator', {
                on: notes[this.state.editing]!.glide,
              })}
              onClick={() => {
                notes[this.state.editing]!.glide =
                  !notes[this.state.editing]!.glide
              }}
            />
          </div>
        </div>
        <ModuleInputs>
          <Socket<Sequencer, 'input', 'gate'>
            moduleId={id}
            type="input"
            label="GATE"
            index={0}
          />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket<Sequencer, 'output', 'cv'>
            moduleId={id}
            type="output"
            label="CV"
            index={0}
          />
          <Socket<Sequencer, 'output', 'gate'>
            moduleId={id}
            type="output"
            label="GATE"
            index={1}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default SequencerNode
