import { Component } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'

import { ModuleOutputs } from '../module-parts/ModuleSockets'
import Knob from '../module-parts/Knob'
import * as styles from './VirtualController.css'
import { VirtualController } from '@modulate/worklets/src/modules'
import assert from '../../assert'
import PlayableKeyboard from '../module-parts/PlayableKeyboard'

type Props = {
  id: string
}

class VirtualControllerModule extends Component<Props> {
  pressedKeys: Float32Array | null = null
  pads: Float32Array | null = null

  constructor(props: Props) {
    super(props)

    engine.onModuleEvent<VirtualController>(
      props.id,
      ({ type, pressed_keys, pads }) => {
        if (type !== 'VirtualControllerPointers') {
          throw new Error(`VirtualController: invalid message type ${type}`)
        }

        this.pressedKeys = engine.getMemorySlice(pressed_keys, 2 * 2)
        this.pads = engine.getMemorySlice(pads, 4)
      }
    )
  }

  onKeysChange = (keys: number[]) => {
    assert(this.pressedKeys !== null)
    {
      const key = keys[0]
      if (typeof key === 'undefined') {
        this.pressedKeys[1] = 0
      } else {
        this.pressedKeys[0] = key
        this.pressedKeys[1] = 1.0
      }
    }

    {
      const key = keys[1]
      if (typeof key === 'undefined') {
        this.pressedKeys[3] = 0
      } else {
        this.pressedKeys[2] = key
        this.pressedKeys[3] = 1.0
      }
    }
  }

  onPadPress = (pad: number) => {
    assert(this.pads !== null)
    this.pads[pad] = 1.0
  }

  onPadRelease = (pad: number) => {
    assert(this.pads !== null)
    this.pads[pad] = 0.0
  }

  render({ id }: Props) {
    return (
      <Module id={id} type="VirtualController" name="Virtual Controller">
        <div class={styles.virtualController}>
          <div class={styles.knobs}>
            <Knob<VirtualController, 'knobA'>
              size="l"
              moduleId={id}
              type="percentage"
              param={0}
              label="A"
              initial={0.0}
            />
            <Knob<VirtualController, 'knobB'>
              size="l"
              moduleId={id}
              type="percentage"
              param={1}
              label="B"
              initial={0.0}
            />
            <Knob<VirtualController, 'knobC'>
              size="l"
              moduleId={id}
              type="percentage"
              param={2}
              label="C"
              initial={0.0}
            />
            <Knob<VirtualController, 'knobD'>
              size="l"
              moduleId={id}
              type="percentage"
              param={3}
              label="D"
              initial={0.0}
            />
          </div>
          <div class={styles.pads}>
            {[0, 1, 2, 3].map((pad) => (
              <button
                key={pad}
                type="button"
                class={styles.pad}
                onTouchStart={(evt: TouchEvent) => {
                  evt.preventDefault()
                  this.onPadPress(pad)
                }}
                onTouchEnd={(evt: TouchEvent) => {
                  evt.preventDefault()
                  this.onPadRelease(pad)
                }}
              />
            ))}
          </div>
          <div>
            <PlayableKeyboard onChange={this.onKeysChange} />
          </div>
        </div>
        <ModuleOutputs>
          <Socket<VirtualController, 'output', 'keyboardFirstCv'>
            moduleId={id}
            type="output"
            label="KB CV"
            index={0}
          />
          <Socket<VirtualController, 'output', 'keyboardFirstGate'>
            moduleId={id}
            type="output"
            label="KB GATE"
            index={1}
          />
          <Socket<VirtualController, 'output', 'keyboardSecondCv'>
            moduleId={id}
            type="output"
            label="KB CV"
            index={2}
          />
          <Socket<VirtualController, 'output', 'keyboardSecondGate'>
            moduleId={id}
            type="output"
            label="KB GATE"
            index={3}
          />

          <Socket<VirtualController, 'output', 'padA'>
            moduleId={id}
            type="output"
            label="PAD A"
            index={4}
          />
          <Socket<VirtualController, 'output', 'padB'>
            moduleId={id}
            type="output"
            label="PAD B"
            index={5}
          />
          <Socket<VirtualController, 'output', 'padC'>
            moduleId={id}
            type="output"
            label="PAD C"
            index={6}
          />
          <Socket<VirtualController, 'output', 'padD'>
            moduleId={id}
            type="output"
            label="PAD D"
            index={7}
          />

          <Socket<VirtualController, 'output', 'knobA'>
            moduleId={id}
            type="output"
            label="KNOB A"
            index={8}
          />
          <Socket<VirtualController, 'output', 'knobB'>
            moduleId={id}
            type="output"
            label="KNOB B"
            index={9}
          />
          <Socket<VirtualController, 'output', 'knobC'>
            moduleId={id}
            type="output"
            label="KNOB C"
            index={10}
          />
          <Socket<VirtualController, 'output', 'knobD'>
            moduleId={id}
            type="output"
            label="KNOB D"
            index={11}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default VirtualControllerModule
