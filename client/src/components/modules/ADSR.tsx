import { h, Component } from 'kaiku'
import * as engine from '../../engine'
import { connectKnobToParam } from '../../modules'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { ADSR } from '@modulate/worklets/src/modules'

type Props = {
  id: string
}

class ADSRNode extends Component<Props> {
  constructor(props: Props) {
    super(props)

    engine.createModule(props.id, 'ADSR')

    connectKnobToParam<ADSR, 'attack'>(props.id, 'attack', 0)
    connectKnobToParam<ADSR, 'decay'>(props.id, 'decay', 1)
    connectKnobToParam<ADSR, 'sustain'>(props.id, 'sustain', 2)
    connectKnobToParam<ADSR, 'release'>(props.id, 'release', 3)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="ADSR" width={200}>
        <Knob
          moduleId={id}
          type="exponential"
          id="attack"
          label="A"
          unit="s"
          exponent={2}
          min={0.001}
          max={1}
          initial={0.1}
        />
        <Knob
          moduleId={id}
          type="exponential"
          id="decay"
          label="D"
          unit="s"
          exponent={2}
          min={0.001}
          max={1}
          initial={0.1}
        />
        <Knob
          moduleId={id}
          type="linear"
          id="sustain"
          label="S"
          min={0}
          max={1}
          initial={0.5}
        />
        <Knob
          moduleId={id}
          type="exponential"
          id="release"
          label="R"
          unit="s"
          exponent={2}
          min={0.001}
          max={1}
          initial={0.1}
        />
        <ModuleInputs>
          <Socket<ADSR, 'input', 'gate'>
            moduleId={id}
            type="input"
            label="GATE"
            index={0}
          />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket<ADSR, 'output', 'envelope'>
            moduleId={id}
            type="output"
            label="ENV"
            index={0}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default ADSRNode
