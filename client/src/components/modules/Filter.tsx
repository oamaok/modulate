import { h, Component, useEffect } from 'kaiku'
import { IModule } from '../../types'
import { getAudioContext } from '../../audio'
import { WorkletNode } from '../../worklets'
import { getModuleKnobs } from '../../state'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { connectKnobToParam } from '../../modules'

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
type Props = {
  id: string
}

class BiquadFilter extends Component<Props> implements IModule {
  node: BiquadFilterNode

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()
    this.node = audioContext.createBiquadFilter()

    connectKnobToParam(props.id, 'freq', this.node.frequency)
    connectKnobToParam(props.id, 'res', this.node.Q)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Filter" width={200}>
        <Knob moduleId={id} name="freq" min={0} max={20000} initial={10} />
        <Knob moduleId={id} name="res" min={0} max={10} initial={0} />
        <ModuleInputs>
          <Socket moduleId={id} type="input" name="in" node={this.node} />
          <Socket
            moduleId={id}
            type="input"
            name="freq"
            node={this.node.frequency}
          />
          <Socket moduleId={id} type="input" name="res" node={this.node.Q} />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket moduleId={id} type="output" name="out" node={this.node} />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default BiquadFilter
