import { h, Component, useEffect } from 'kaiku'
import { IModule, Id } from '../../types'
import { getAudioContext } from '../../audio'
import { WorkletNode } from '../../worklets'
import { getModuleKnobs } from '../../state'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { connectKnobToParam } from '../../modules'

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
type Props = {
  id: Id
}

class Clock extends Component<Props> implements IModule {
  node: WorkletNode<'Clock'>

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()
    this.node = new WorkletNode(audioContext, 'Clock', {
      numberOfOutputs: 4,
    })
    const tempo = this.node.parameters.get('tempo')
    const pulseWidth = this.node.parameters.get('pulseWidth')

    connectKnobToParam(props.id, 'tempo', tempo)
    connectKnobToParam(props.id, 'pulseWidth', pulseWidth)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Clock">
        <Knob moduleId={id} name="tempo" min={1} max={500} initial={128} />
        <Knob moduleId={id} name="pulseWidth" min={0} max={1} initial={0.5} />
        <ModuleOutputs>
          <Socket
            moduleId={id}
            type="output"
            name="1/4"
            node={this.node}
            output={0}
          />
          <Socket
            moduleId={id}
            type="output"
            name="1/8"
            node={this.node}
            output={1}
          />
          <Socket
            moduleId={id}
            type="output"
            name="1/16"
            node={this.node}
            output={2}
          />
          <Socket
            moduleId={id}
            type="output"
            name="1/32"
            node={this.node}
            output={3}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default Clock
