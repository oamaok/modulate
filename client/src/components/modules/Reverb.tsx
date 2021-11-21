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

class Reverb extends Component<Props> implements IModule {
  node: WorkletNode<'Reverb'>

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()

    this.node = new WorkletNode(audioContext, 'Reverb')

    const dry = this.node.parameters.get('dry')
    const wet = this.node.parameters.get('wet')
    const decay = this.node.parameters.get('decay')
    const delay = this.node.parameters.get('delay')
    const diffuse = this.node.parameters.get('diffuse')

    connectKnobToParam(props.id, 'dry', dry)
    connectKnobToParam(props.id, 'wet', wet)
    connectKnobToParam(props.id, 'decay', decay)
    connectKnobToParam(props.id, 'delay', delay)
    connectKnobToParam(props.id, 'diffuse', diffuse)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Reverb" width={250} height={120}>
        <Knob
          moduleId={id}
          id="delay"
          type="linear"
          min={0}
          max={0.2}
          initial={0.1}
        />
        <Knob
          moduleId={id}
          id="decay"
          type="linear"
          min={0}
          max={0.99}
          initial={0.6}
        />
        <Knob
          moduleId={id}
          id="diffuse"
          type="linear"
          min={0}
          max={1}
          initial={0.7}
        />
        <Knob
          moduleId={id}
          id="wet"
          type="linear"
          min={0}
          max={1}
          initial={0.5}
        />
        <Knob
          moduleId={id}
          id="dry"
          type="linear"
          min={0}
          max={1}
          initial={1}
        />
        <ModuleInputs>
          <Socket
            moduleId={id}
            type="input"
            name="DLY"
            node={this.node.parameters.get('delay')}
          />
          <Socket
            moduleId={id}
            type="input"
            name="DCY"
            node={this.node.parameters.get('decay')}
          />
          <Socket
            moduleId={id}
            type="input"
            name="DFS"
            node={this.node.parameters.get('diffuse')}
          />
          <Socket moduleId={id} type="input" name="IN" node={this.node} />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket moduleId={id} type="output" name="OUT" node={this.node} />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default Reverb
