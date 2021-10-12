import { h, Component, useEffect } from 'kaiku'
import { IModule, Id } from '../../types'
import { getAudioContext } from '../../audio'
import { WorkletNode } from '../../worklets'
import { getModuleKnobs } from '../../state'
import Socket from '../Socket'
import Module from '../Module'
import Knob from '../Knob'

type Props = {
  id: Id
}

class Gain extends Component<Props> implements IModule {
  node: WorkletNode<'Gain'>

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()
    this.node = new WorkletNode(audioContext, 'Gain')

    const level = this.node.parameters.get('level')

    useEffect(() => {
      const knobs = getModuleKnobs(props.id)

      if (knobs) {
        level.setTargetAtTime(knobs.gain, audioContext.currentTime, 0.01)
      }
    })
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Gain">
        <div className="module-body">
          <Knob moduleId={id} name="gain" min={0} max={2} initial={0.4} />
        </div>
        <div className="module-inputs">
          <Socket
            moduleId={id}
            type="input"
            name="gain"
            node={this.node.parameters.get('level')}
          />
          <Socket moduleId={id} type="input" name="in" node={this.node} />
        </div>
        <div className="module-outputs">
          <Socket moduleId={id} type="output" name="out" node={this.node} />
        </div>
      </Module>
    )
  }
}

export default Gain
