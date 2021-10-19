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

class LFO extends Component<Props> implements IModule {
  node: OscillatorNode

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()
    this.node = audioContext.createOscillator()
    this.node.start()

    connectKnobToParam(props.id, 'frequency', this.node.frequency)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="LFO" width={120}>
        <Knob moduleId={id} name="frequency" min={0.01} max={10} initial={1} />

        <ModuleInputs></ModuleInputs>

        <ModuleOutputs>
          <Socket moduleId={id} type="output" name="out" node={this.node} />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default LFO
