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

class MIDI extends Component<Props> implements IModule {
  node: WorkletNode<'MIDI'>

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()
    this.node = new WorkletNode(audioContext, 'MIDI', {
      numberOfOutputs: 3,
    })

    navigator.requestMIDIAccess().then((midiAccess) => {
      console.log(midiAccess.inputs)
      midiAccess.inputs.forEach((entry) => {
        entry.onmidimessage = (msg) => {
          let data = 0
          for (let i = 0; i < msg.data.length; i++) {
            data |= msg.data[i] << (i * 8)
          }
          console.log(data)

          this.node.port.postMessage(data)
        }
      })
    }, console.error)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="MIDI" width={50}>
        <ModuleInputs></ModuleInputs>
        <ModuleOutputs>
          <Socket
            moduleId={id}
            type="output"
            name="CV"
            node={this.node}
            output={0}
          />
          <Socket
            moduleId={id}
            type="output"
            name="VEL"
            node={this.node}
            output={1}
          />
          <Socket
            moduleId={id}
            type="output"
            name="GATE"
            node={this.node}
            output={2}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default MIDI
