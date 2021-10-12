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

class Clock extends Component<Props> implements IModule {
  node: WorkletNode<'Clock'>

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()
    this.node = new WorkletNode(audioContext, 'Clock')
    const tempo = this.node.parameters.get('tempo')
    const pulseWidth = this.node.parameters.get('pulseWidth')

    connectKnobToParam(props.id, 'tempo', tempo)
    connectKnobToParam(props.id, 'pulseWidth', pulseWidth)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Clock">
        <div className="module-body">
          <Knob moduleId={id} name="tempo" min={1} max={500} initial={128} />
          <Knob moduleId={id} name="pulseWidth" min={0} max={1} initial={0.5} />
          <Socket moduleId={id} type="output" name="out" node={this.node} />
        </div>
      </Module>
    )
  }
}

export default Clock
