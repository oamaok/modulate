import { h, Component, useEffect } from 'kaiku'
import { IModule } from '../../types'
import { getAudioContext } from '../../audio'
import { WorkletNode } from '../../worklets'
import { getModuleKnobs } from '../../state'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { connectKnobToParam } from '../../modules'

type Props = {
  id: string
}

class PowShaper extends Component<Props> implements IModule {
  node: WorkletNode<'PowShaper'>

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()
    this.node = new WorkletNode(audioContext, 'PowShaper')

    const gain = this.node.parameters.get('gain')
    const preGain = this.node.parameters.get('preGain')
    const exponent = this.node.parameters.get('exponent')

    connectKnobToParam(props.id, 'gain', gain)
    connectKnobToParam(props.id, 'preGain', preGain)
    connectKnobToParam(props.id, 'exponent', exponent)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="PowShaper">
        <Knob
          moduleId={id}
          id="exponent"
          type="linear"
          min={0.01}
          max={2}
          initial={2}
        />
        <Knob
          moduleId={id}
          id="preGain"
          type="linear"
          min={0}
          max={2}
          initial={1}
        />
        <Knob
          moduleId={id}
          id="gain"
          type="linear"
          min={0}
          max={2}
          initial={1}
        />
        <ModuleInputs>
          <Socket
            moduleId={id}
            type="input"
            name="EXP"
            node={this.node.parameters.get('exponent')}
          />
          <Socket
            moduleId={id}
            type="input"
            name="PRE"
            node={this.node.parameters.get('preGain')}
          />
          <Socket
            moduleId={id}
            type="input"
            name="GAIN"
            node={this.node.parameters.get('gain')}
          />
          <Socket moduleId={id} type="input" name="in" node={this.node} />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket moduleId={id} type="output" name="out" node={this.node} />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default PowShaper
