import { h, Component, useEffect } from 'kaiku'
import { IModule } from '../../types'
import { getAudioContext } from '../../audio'
import { WorkletNode } from '../../worklets'
import { getModuleKnobs } from '../../state'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'

type Props = {
  id: string
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
        <Knob moduleId={id} name="gain" min={0} max={2} initial={0.4} />
        <ModuleInputs>
          <Socket
            moduleId={id}
            type="input"
            name="gain"
            node={this.node.parameters.get('level')}
          />
          <Socket moduleId={id} type="input" name="in" node={this.node} />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket moduleId={id} type="output" name="out" node={this.node} />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default Gain
