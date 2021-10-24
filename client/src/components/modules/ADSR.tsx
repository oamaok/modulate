import { h, Component } from 'kaiku'
import { IModule, Id } from '../../types'
import { getAudioContext } from '../../audio'
import { WorkletNode } from '../../worklets'
import { connectKnobToParam } from '../../modules'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'

type Props = {
  id: Id
}

class ADSR extends Component<Props> implements IModule {
  node: WorkletNode<'ADSR'>

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()

    this.node = new WorkletNode(audioContext, 'ADSR')

    const attack = this.node.parameters.get('attack')
    const decay = this.node.parameters.get('decay')
    const sustain = this.node.parameters.get('sustain')
    const release = this.node.parameters.get('release')

    connectKnobToParam(props.id, 'attack', attack)
    connectKnobToParam(props.id, 'decay', decay)
    connectKnobToParam(props.id, 'sustain', sustain)
    connectKnobToParam(props.id, 'release', release)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="ADSR" width={250}>
        <Knob moduleId={id} name="attack" min={0.001} max={1} initial={0.1} />
        <Knob moduleId={id} name="decay" min={0.001} max={1} initial={0.1} />
        <Knob moduleId={id} name="sustain" min={0} max={1} initial={0.5} />
        <Knob moduleId={id} name="release" min={0.001} max={1} initial={0.1} />
        <ModuleInputs>
          <Socket moduleId={id} type="input" name="gate" node={this.node} />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket moduleId={id} type="output" name="out" node={this.node} />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default ADSR
