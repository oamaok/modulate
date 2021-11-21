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

class Limiter extends Component<Props> implements IModule {
  node: WorkletNode<'Limiter'>

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()
    this.node = new WorkletNode(audioContext, 'Limiter')

    const threshold = this.node.parameters.get('threshold')

    connectKnobToParam(props.id, 'threshold', threshold)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Limiter">
        <Knob moduleId={id} id="threshold" type="percentage" initial={0.4} />
        <ModuleInputs>
          <Socket
            moduleId={id}
            type="input"
            name="threshold"
            node={this.node.parameters.get('threshold')}
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

export default Limiter
