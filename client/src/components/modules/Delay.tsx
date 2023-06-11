import { h, Component } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { connectKnobToParam } from '../../modules'

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { Delay } from '@modulate/worklets/src/modules'
type Props = {
  id: string
}

class DelayNode extends Component<Props> {
  constructor(props: Props) {
    super(props)
    engine.createModule(props.id, 'Delay')

    connectKnobToParam<Delay, 'time'>(props.id, 'delayTime', 0)
    connectKnobToParam<Delay, 'feedback'>(props.id, 'feedBack', 1)
    connectKnobToParam<Delay, 'wet'>(props.id, 'wet', 2)
    connectKnobToParam<Delay, 'dry'>(props.id, 'dry', 3)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Delay">
        <Knob
          moduleId={id}
          id="delayTime"
          label="TIME"
          type="exponential"
          exponent={2}
          unit="s"
          min={0.01}
          max={2}
          initial={0.5}
        />
        <Knob
          moduleId={id}
          id="feedBack"
          label="FDBK"
          type="percentage"
          initial={0.2}
        />
        <Knob
          moduleId={id}
          id="wet"
          label="WET"
          type="percentage"
          initial={0.5}
        />
        <Knob
          moduleId={id}
          id="dry"
          label="DRY"
          type="percentage"
          initial={1}
        />
        <ModuleInputs>
          <Socket<Delay, 'parameter', 'feedback'>
            moduleId={id}
            type="parameter"
            label="FDBK"
            index={1}
          />
          <Socket<Delay, 'parameter', 'time'>
            moduleId={id}
            type="parameter"
            label="TIME"
            index={0}
          />
          <Socket<Delay, 'input', 'input'>
            moduleId={id}
            type="input"
            label="IN"
            index={0}
          />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket<Delay, 'output', 'output'>
            moduleId={id}
            type="output"
            label="OUT"
            index={0}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default DelayNode
