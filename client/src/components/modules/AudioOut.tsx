import { h, Component } from 'kaiku'
import { IModule, Id } from '../../types'
import { getAudioContext } from '../../audio'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
type Props = {
  id: Id
}

class AudioOut extends Component<Props> implements IModule {
  node: AudioDestinationNode
  gain: GainNode

  constructor(props: Props) {
    super(props)
    const context = getAudioContext()
    this.node = context.destination
    this.gain = context.createGain()

    this.gain.gain.setValueAtTime(0, 0)
    this.gain.gain.setTargetAtTime(0, context.currentTime, 0.1)
    this.gain.gain.setTargetAtTime(1, context.currentTime + 0.1, 0.01)
    this.gain.connect(this.node)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Audio Out">
        <div className="module-body"></div>
        <ModuleInputs>
          <Socket
            moduleId={id}
            type="input"
            name="destination"
            node={this.gain}
          />
        </ModuleInputs>
      </Module>
    )
  }
}

export default AudioOut
