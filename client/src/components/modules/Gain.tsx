import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { Gain } from '@modulate/worklets/src/modules'

type Props = {
  id: string
}

const GainNode = ({ id }: Props) => {
  return (
    <Module id={id} type="Gain">
      <Knob<Gain, 'gain'>
        moduleId={id}
        param={0}
        label="GAIN"
        type="linear"
        min={0}
        max={2}
        initial={0.4}
      />
      <ModuleInputs>
        <Socket<Gain, 'parameter', 'gain'>
          moduleId={id}
          type="parameter"
          index={0}
          label="GAIN"
        />
        <Socket<Gain, 'input', 'input'>
          moduleId={id}
          type="input"
          index={0}
          label="IN"
        />
      </ModuleInputs>
      <ModuleOutputs>
        <Socket<Gain, 'output', 'output'>
          moduleId={id}
          type="output"
          index={0}
          label="OUT"
        />
      </ModuleOutputs>
    </Module>
  )
}

export default GainNode
