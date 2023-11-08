import { Component } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'

import { ModuleInputs } from '../module-parts/ModuleSockets'
import Knob from '../module-parts/Knob'
import { AudioOut } from '@modulate/worklets/src/modules'
type Props = {
  id: string
}

class AudioOutNode extends Component<Props> {
  constructor(props: Props) {
    super(props)
    engine.createModule(props.id, 'AudioOut')
  }

  render({ id }: Props) {
    return (
      <Module id={id} type="AudioOut" name="Audio Out">
        <Knob<AudioOut, 'volume'>
          moduleId={id}
          type="percentage"
          param={0}
          label="VOL"
          initial={0.75}
        />
        <ModuleInputs>
          <Socket<AudioOut, 'input', 'input'>
            moduleId={id}
            type="input"
            label=""
            index={0}
          />
        </ModuleInputs>
      </Module>
    )
  }
}

export default AudioOutNode
