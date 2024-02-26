import { Component, useEffect } from 'kaiku'
import * as util from '@modulate/common/util'
import { NoteName, Note } from '@modulate/common/types'
import { Sequencer } from '@modulate/worklets/src/modules'
import * as engine from '../../engine'
import { getKnobValue, getModuleState, setModuleState } from '../../state'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import * as styles from './Sequencer.css'

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
  state = {
    currentStep: 0,
    editing: 0,
  }

  constructor(props: Props) {
    super(props)

    engine.onModuleEvent<Sequencer>(props.id, ({ position }) => {
      this.state.currentStep = position
    })

    if (!getModuleState<SequencerState>(props.id)) {
      setModuleState<SequencerState>(props.id, {
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
  }

  render({ id }: Props) {
    const { notes } = getModuleState<SequencerState>(id)

    const groupedNotes = util.splitEvery(util.splitEvery(notes, 4), 4)
    const sequenceLength = getKnobValue<Sequencer, 'length'>(id, 0) ?? 32

    return (
      <Module id={id} type="Sequencer">
        <div class={styles.sequencer}>
          <div class={styles.steps}>
            {groupedNotes.map((groups) => (
              <div class={styles.row}>
                {groups.map((group) => (
                  <div class={styles.group}>
                    {group.map((note) => (
                      <button
                        class={() => [
                          styles.indicator,
                          {
                            [styles.on]: note.index === this.state.editing,
                            [styles.current]:
                              note.index === this.state.currentStep,
                            [styles.disabled]: note.index >= sequenceLength,
                          },
                        ]}
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
          <div class={styles.middle}>
            <div class={styles.octaves}>
              {OCTAVES.map((oct) => (
                <button
                  onClick={() => {
                    notes[this.state.editing]!.octave = oct
                  }}
                  class={[
                    styles.indicator,
                    {
                      [styles.on]: notes[this.state.editing]!.octave === oct,
                    },
                  ]}
                />
              ))}
            </div>
            <Keyboard
              note={notes[this.state.editing]!.name}
              onChange={(note) => {
                notes[this.state.editing]!.name = note as NoteName
              }}
            />
            <Knob<Sequencer, 'length'>
              moduleId={id}
              param={0}
              type="stepped"
              step={1}
              min={1}
              max={32}
              initial={16}
              label="LEN"
            />
            <Knob<Sequencer, 'glide'>
              moduleId={id}
              param={1}
              type="exponential"
              exponent={2}
              min={0}
              max={1}
              initial={0}
              label="GLIDE"
            />
          </div>
          <div class={styles.noteControls}>
            Gate
            <button
              class={[
                styles.indicator,
                {
                  [styles.on]: notes[this.state.editing]!.gate,
                },
              ]}
              onClick={() => {
                notes[this.state.editing]!.gate =
                  !notes[this.state.editing]!.gate
              }}
            />
            Glide
            <button
              class={[
                styles.indicator,
                {
                  [styles.on]: notes[this.state.editing]!.glide,
                },
              ]}
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
          <Socket<Sequencer, 'output', 'gate'>
            moduleId={id}
            type="output"
            label="GATE"
            index={1}
          />
          <Socket<Sequencer, 'output', 'cv'>
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

export default SequencerNode
