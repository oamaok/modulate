import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import Knob from '../module-parts/Knob'
import { Distortion } from '@modulate/worklets/src/modules'
type Props = {
  id: string
}

const DistortionNode = ({ id }: Props) => {
  return (
    <Module id={id} type="Distortion" name="Distortion">
      <Knob<Distortion, 'mix'>
        moduleId={id}
        param={0}
        label="MIX"
        type="linear"
        min={0}
        max={1}
        initial={0.5}
      />
      <Knob<Distortion, 'tone'>
        moduleId={id}
        param={1}
        label="TONE"
        type="linear"
        min={-2}
        max={2}
        initial={-2}
      />
      <ModuleInputs>
        <Socket<Distortion, 'input', 'input'>
          moduleId={id}
          type="input"
          index={0}
          label="IN"
        />
      </ModuleInputs>
      <ModuleOutputs>
        <Socket<Distortion, 'output', 'output'>
          moduleId={id}
          type="output"
          index={0}
          label="OUT"
        />
      </ModuleOutputs>
    </Module>
  )
}

export default DistortionNode
