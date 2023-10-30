import { Component } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'

import { ModuleOutputs } from '../module-parts/ModuleSockets'
import { connectKnobToParam } from '../../modules'
import Knob from '../module-parts/Knob'
import css from './VirtualController.css'
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

    engine.createModule(props.id, 'VirtualController')
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

    connectKnobToParam<VirtualController, 'knobA'>(props.id, 'knobA', 0)
    connectKnobToParam<VirtualController, 'knobB'>(props.id, 'knobB', 1)
    connectKnobToParam<VirtualController, 'knobC'>(props.id, 'knobC', 2)
    connectKnobToParam<VirtualController, 'knobD'>(props.id, 'knobD', 3)
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
      <Module
        id={id}
        type="VirtualController"
        name="Virtual Controller"
        width={800}
        height={450}
      >
        <div className={css('virtual-controller')}>
          <div className={css('knobs')}>
            <Knob
              size="l"
              moduleId={id}
              type="percentage"
              id="knobA"
              label="A"
              initial={0.0}
            />
            <Knob
              size="l"
              moduleId={id}
              type="percentage"
              id="knobB"
              label="B"
              initial={0.0}
            />
            <Knob
              size="l"
              moduleId={id}
              type="percentage"
              id="knobC"
              label="C"
              initial={0.0}
            />
            <Knob
              size="l"
              moduleId={id}
              type="percentage"
              id="knobD"
              label="D"
              initial={0.0}
            />
          </div>
          <div className={css('pads')}>
            {[0, 1, 2, 3].map((pad) => (
              <button
                key={pad}
                type="button"
                className={css('pad')}
                onTouchStart={(evt) => {
                  evt.preventDefault()
                  this.onPadPress(pad)
                }}
                onTouchEnd={(evt) => {
                  evt.preventDefault()
                  this.onPadRelease(pad)
                }}
              />
            ))}
          </div>
          <div className={css('keyboard')}>
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
