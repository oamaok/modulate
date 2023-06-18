import { h, Component } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { connectKnobToParam } from '../../modules'
import { Gain } from '@modulate/worklets/src/modules'

type Props = {
  id: string
}

class GainNode extends Component<Props> {
  constructor(props: Props) {
    super(props)
    engine.createModule(props.id, 'Gain')
    connectKnobToParam<Gain, 'gain'>(props.id, 'gain', 0)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Gain">
        <Knob
          moduleId={id}
          id="gain"
          label="Gain"
          type="linear"
          min={0}
          max={2}
          initial={0.4}
        />
        <ModuleInputs>
          <Socket<Gain, 'parameter', 'gain'>
            moduleId={id}
            type="parameter"
            index={0}
            label="GAIN"
          />
          <Socket<Gain, 'input', 'input'>
            moduleId={id}
            type="input"
            index={0}
            label="IN"
          />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket<Gain, 'output', 'output'>
            moduleId={id}
            type="output"
            index={0}
            label="OUT"
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default GainNode
