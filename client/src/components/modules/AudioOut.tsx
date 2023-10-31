import { Component } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'

import { ModuleInputs } from '../module-parts/ModuleSockets'
import { connectKnobToParam } from '../../modules'
import Knob from '../module-parts/Knob'
import { AudioOut } from '@modulate/worklets/src/modules'
type Props = {
  id: string
}

class AudioOutNode extends Component<Props> {
  constructor(props: Props) {
    super(props)
    engine.createModule(props.id, 'AudioOut')
    connectKnobToParam<AudioOut, 'volume'>(props.id, 'volume', 0)
  }

  render({ id }: Props) {
    return (
      <Module id={id} type="AudioOut" name="Audio Out" width={100}>
        <Knob
          moduleId={id}
          type="percentage"
          id="volume"
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
