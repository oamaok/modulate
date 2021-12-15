import { h, Component } from 'kaiku'
import { IModule } from '../../types'
import { getAudioContext } from '../../audio'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'

import { ModuleInputs } from '../module-parts/ModuleSockets'
import { connectKnobToParam } from '../../modules'
import Knob from '../module-parts/Knob'
type Props = {
  id: string
}

class AudioOut extends Component<Props> implements IModule {
  node: AudioDestinationNode
  gain: GainNode

  constructor(props: Props) {
    super(props)
    const context = getAudioContext()
    this.node = context.destination
    this.gain = context.createGain()

    this.gain.connect(this.node)

    connectKnobToParam(props.id, 'level', this.gain.gain)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Audio Out" width={100}>
        <Knob
          moduleId={id}
          type="percentage"
          id="level"
          label="Level"
          initial={0.75}
        />
        <ModuleInputs>
          <Socket
            moduleId={id}
            type="input"
            name="destination"
            label=""
            node={this.gain}
          />
        </ModuleInputs>
      </Module>
    )
  }
}

export default AudioOut
