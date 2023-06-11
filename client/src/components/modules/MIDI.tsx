import { h, Component } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { MIDI } from '@modulate/worklets/src/modules'

type Props = {
  id: string
}

class MIDINode extends Component<Props> {
  constructor(props: Props) {
    super(props)

    engine.createModule(props.id, 'MIDI')

    navigator.requestMIDIAccess().then((midiAccess) => {
      midiAccess.inputs.forEach((entry) => {
        entry.onmidimessage = (msg) => {
          const midiEvent = msg as MIDIMessageEvent
          let data = 0
          for (let i = 0; i < midiEvent.data.length; i++) {
            data |= midiEvent.data[i]! << (i * 8)
          }

          engine.sendMessageToModule<MIDI>(props.id, {
            type: 'MidiMessage',
            message: data,
          })
        }
      })
    }, console.error)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="MIDI" width={50}>
        <ModuleInputs></ModuleInputs>
        <ModuleOutputs>
          <Socket<MIDI, 'output', 'cv'>
            moduleId={id}
            type="output"
            label="CV"
            index={0}
          />
          <Socket<MIDI, 'output', 'velocity'>
            moduleId={id}
            type="output"
            label="VEL"
            index={1}
          />
          <Socket<MIDI, 'output', 'gate'>
            moduleId={id}
            type="output"
            label="GATE"
            index={2}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default MIDINode
