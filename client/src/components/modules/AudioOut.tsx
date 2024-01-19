import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'

import { ModuleInputs } from '../module-parts/ModuleSockets'
import Knob from '../module-parts/Knob'
import { AudioOut } from '@modulate/worklets/src/modules'
type Props = {
  id: string
}

const AudioOutNode = ({ id }: Props) => {
  return (
    <Module id={id} type="AudioOut" name="Audio Out">
      <Knob<AudioOut, 'volume'>
        moduleId={id}
        type="percentage"
        param={0}
        label="VOL"
        hideLabel
        size="m"
        initial={0.75}
      />
      <ModuleInputs>
        <Socket<AudioOut, 'input', 'inputLeft'>
          moduleId={id}
          type="input"
          label="L"
          index={0}
        />
        <Socket<AudioOut, 'input', 'inputRight'>
          moduleId={id}
          type="input"
          label="R"
          index={1}
        />
      </ModuleInputs>
    </Module>
  )
}

export default AudioOutNode
