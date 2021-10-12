import { h, Component, useEffect } from 'kaiku'
import { IModule, Id } from '../../types'
import { getAudioContext } from '../../audio'
import { WorkletNode } from '../../worklets'
import { getModuleKnobs } from '../../state'
import Socket from '../Socket'
import Module from '../Module'
import Knob from '../Knob'
import { connectKnobToParam } from '../../modules'

type Props = {
  id: Id
}

class BiquadFilter extends Component<Props> implements IModule {
  node: BiquadFilterNode
  modulationHelper: WorkletNode<'ModulationHelper'>

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()
    this.node = audioContext.createBiquadFilter()

    this.modulationHelper = new WorkletNode(audioContext, 'ModulationHelper')
    this.modulationHelper.connect(this.node.frequency)

    connectKnobToParam(
      props.id,
      'freq',
      this.modulationHelper.parameters.get('level')
    )
    connectKnobToParam(props.id, 'res', this.node.Q)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Filter" width={300}>
        <div className="module-body">
          <Knob moduleId={id} name="freq" min={0} max={10} initial={10} />
          <Knob moduleId={id} name="res" min={0} max={10} initial={0} />
        </div>
        <div className="module-inputs">
          <Socket moduleId={id} type="input" name="in" node={this.node} />
          <Socket
            moduleId={id}
            type="input"
            name="freq"
            node={this.modulationHelper}
          />
          <Socket moduleId={id} type="input" name="res" node={this.node.Q} />
        </div>
        <div className="module-outputs">
          <Socket moduleId={id} type="output" name="out" node={this.node} />
        </div>
      </Module>
    )
  }
}

export default BiquadFilter
