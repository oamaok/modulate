import { h, Component } from 'kaiku'
import * as engine from '../../engine'
import { WorkletNode } from '../../worklets'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { connectKnobToParam } from '../../modules'
import { PowShaper } from '@modulate/worklets/src/modules'

type Props = {
  id: string
}

class PowShaperNode extends Component<Props> {
  node: WorkletNode<'PowShaper'>

  constructor(props: Props) {
    super(props)

    engine.createModule(props.id, 'PowShaper')

    connectKnobToParam<PowShaper, 'gain'>(props.id, 'gain', 1)
    connectKnobToParam<PowShaper, 'preGain'>(props.id, 'preGain', 2)
    connectKnobToParam<PowShaper, 'exponent'>(props.id, 'exponent', 0)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="PowShaper">
        <Knob
          moduleId={id}
          id="exponent"
          label="EXP"
          type="linear"
          min={0.01}
          max={2}
          initial={2}
        />
        <Knob
          moduleId={id}
          id="preGain"
          label="PRE-GAIN"
          type="linear"
          min={0}
          max={2}
          initial={1}
        />
        <Knob
          moduleId={id}
          id="gain"
          label="GAIN"
          type="linear"
          min={0}
          max={2}
          initial={1}
        />
        <ModuleInputs>
          <Socket<PowShaper, 'input', 'input'>
            moduleId={id}
            type="input"
            label="IN"
            index={0}
          />
          <Socket<PowShaper, 'parameter', 'exponent'>
            moduleId={id}
            type="parameter"
            label="EXP"
            index={0}
          />
          <Socket<PowShaper, 'parameter', 'preGain'>
            moduleId={id}
            type="parameter"
            label="PRE"
            index={2}
          />
          <Socket<PowShaper, 'parameter', 'gain'>
            moduleId={id}
            type="parameter"
            label="GAIN"
            index={1}
          />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket<PowShaper, 'output', 'output'>
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

export default PowShaperNode
