import { h, Component } from 'kaiku'
import { IModule, Id } from '../../types'
import { getAudioContext } from '../../audio'
import { WorkletNode } from '../../worklets'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { connectKnobToParam } from '../../modules'

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
type Props = {
  id: Id
}

class Oscillator extends Component<Props> implements IModule {
  node: OscillatorNode
  frequencyNode: WorkletNode<'ModulationHelper'>

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()
    this.node = audioContext.createOscillator()
    this.node.frequency.value = 0
    this.node.start()
    this.node.type = 'sawtooth'

    this.frequencyNode = new WorkletNode(audioContext, 'ModulationHelper')
    this.frequencyNode.connect(this.node.frequency)

    const freq = this.frequencyNode.parameters.get('level')

    connectKnobToParam(props.id, 'frequency', freq)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Oscillator">
        <Knob moduleId={id} name="frequency" min={-1} max={10} initial={5} />

        <ModuleInputs>
          <Socket
            moduleId={id}
            type="input"
            name="freq"
            node={this.frequencyNode}
          />
        </ModuleInputs>

        <ModuleOutputs>
          <Socket moduleId={id} type="output" name="out" node={this.node} />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default Oscillator
