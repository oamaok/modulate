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
  node: WorkletNode<'Filter'>

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()
    this.node = new WorkletNode(audioContext, 'Filter', {
      numberOfInputs: 1,
      numberOfOutputs: 2,
    })

    const frequency = this.node.parameters.get('frequency')
    const q = this.node.parameters.get('Q')

    connectKnobToParam(props.id, 'frequency', frequency)
    connectKnobToParam(props.id, 'res', q)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Filter" width={200}>
        <Knob
          moduleId={id}
          id="frequency"
          type="linear"
          min={-5}
          max={5}
          initial={0}
        />
        <Knob
          moduleId={id}
          id="res"
          type="linear"
          min={1}
          max={20}
          initial={1}
        />
        <ModuleInputs>
          <Socket moduleId={id} type="input" name="in" node={this.node} />
          <Socket
            moduleId={id}
            type="input"
            name="freq"
            node={this.node.parameters.get('frequency')}
          />
          <Socket
            moduleId={id}
            type="input"
            name="res"
            node={this.node.parameters.get('Q')}
          />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket
            moduleId={id}
            type="output"
            output={0}
            name="LP"
            node={this.node}
          />
          <Socket
            moduleId={id}
            type="output"
            output={1}
            name="HP"
            node={this.node}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default BiquadFilter
