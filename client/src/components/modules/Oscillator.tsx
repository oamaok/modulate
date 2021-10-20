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

class Oscillator extends Component<Props> implements IModule {
  node: WorkletNode<'Oscillator'>

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()

    this.node = new WorkletNode(audioContext, 'Oscillator', {
      numberOfInputs: 3,
      numberOfOutputs: 4,
    })

    connectKnobToParam(props.id, 'CV', this.node.parameters.get('cv'))
    connectKnobToParam(props.id, 'FM', this.node.parameters.get('fm'))
    connectKnobToParam(props.id, 'Fine', this.node.parameters.get('fine'))
    connectKnobToParam(props.id, 'PW', this.node.parameters.get('pw'))
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Oscillator">
        <Knob moduleId={id} name="CV" min={-5} max={5} initial={0} />
        <Knob moduleId={id} name="FM" min={-1} max={1} initial={0} />
        <Knob moduleId={id} name="Fine" min={-1} max={1} initial={0} />
        <Knob moduleId={id} name="PW" min={0} max={1} initial={0.5} />

        <ModuleInputs>
          <Socket
            moduleId={id}
            type="input"
            name="CV"
            input={0}
            node={this.node}
          />
          <Socket
            moduleId={id}
            type="input"
            name="FM"
            input={1}
            node={this.node}
          />
          <Socket
            moduleId={id}
            type="input"
            name="PW"
            input={2}
            node={this.node}
          />
        </ModuleInputs>

        <ModuleOutputs>
          <Socket
            moduleId={id}
            type="output"
            name="SIN"
            output={0}
            node={this.node}
          />
          <Socket
            moduleId={id}
            type="output"
            name="TRI"
            output={1}
            node={this.node}
          />
          <Socket
            moduleId={id}
            type="output"
            name="SAW"
            output={2}
            node={this.node}
          />
          <Socket
            moduleId={id}
            type="output"
            name="SQR"
            output={3}
            node={this.node}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default Oscillator
