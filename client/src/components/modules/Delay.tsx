import { h, Component } from 'kaiku'
import { IModule } from '../../types'
import { getAudioContext } from '../../audio'
import { WorkletNode } from '../../worklets'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { connectKnobToParam } from '../../modules'

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
type Props = {
  id: string
}

class Delay extends Component<Props> implements IModule {
  node: WorkletNode<'Delay'>

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()

    this.node = new WorkletNode(audioContext, 'Delay', {
      numberOfOutputs: 2,
    })

    const dry = this.node.parameters.get('dry')
    const wet = this.node.parameters.get('wet')
    const delayTime = this.node.parameters.get('delayTime')
    const feedBack = this.node.parameters.get('feedBack')

    connectKnobToParam(props.id, 'dry', dry)
    connectKnobToParam(props.id, 'wet', wet)
    connectKnobToParam(props.id, 'delayTime', delayTime)
    connectKnobToParam(props.id, 'feedBack', feedBack)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Delay">
        <Knob moduleId={id} name="delayTime" min={0.01} max={2} initial={0.5} />
        <Knob moduleId={id} name="feedBack" min={0} max={1} initial={0.2} />
        <Knob moduleId={id} name="wet" min={0} max={1} initial={0.5} />
        <Knob moduleId={id} name="dry" min={0} max={1} initial={1} />
        <ModuleInputs>
          <Socket
            moduleId={id}
            type="input"
            name="Feedback"
            node={this.node.parameters.get('feedBack')}
          />
          <Socket
            moduleId={id}
            type="input"
            name="Delay"
            node={this.node.parameters.get('delayTime')}
          />
          <Socket moduleId={id} type="input" name="In" node={this.node} />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket moduleId={id} type="output" name="Out" node={this.node} />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default Delay
