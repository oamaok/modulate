import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { PowShaper } from '@modulate/worklets/src/modules'
import ModuleControls from '../module-parts/ModuleControls'

type Props = {
  id: string
}

const PowShaperNode = ({ id }: Props) => {
  return (
    <Module id={id} type="PowShaper" name="Pow Shaper">
      <ModuleControls>
        <Knob<PowShaper, 'exponent'>
          moduleId={id}
          param={0}
          label="EXP"
          type="linear"
          min={0.01}
          max={2}
          initial={1}
        />
        <Knob<PowShaper, 'preGain'>
          moduleId={id}
          param={2}
          label="PRE-GAIN"
          type="linear"
          min={0}
          max={2}
          initial={1}
        />
        <Knob<PowShaper, 'gain'>
          moduleId={id}
          param={1}
          label="GAIN"
          type="linear"
          min={0}
          max={2}
          initial={1}
        />
      </ModuleControls>
      <ModuleInputs>
        <Socket<PowShaper, 'input', 'input'>
          moduleId={id}
          type="input"
          label="IN"
          index={0}
        />
        <Socket<PowShaper, 'parameter', 'exponent'>
          moduleId={id}
          type="parameter"
          label="EXP"
          index={0}
        />
        <Socket<PowShaper, 'parameter', 'preGain'>
          moduleId={id}
          type="parameter"
          label="PRE"
          index={2}
        />
        <Socket<PowShaper, 'parameter', 'gain'>
          moduleId={id}
          type="parameter"
          label="GAIN"
          index={1}
        />
      </ModuleInputs>
      <ModuleOutputs>
        <Socket<PowShaper, 'output', 'output'>
          moduleId={id}
          type="output"
          label="OUT"
          index={0}
        />
      </ModuleOutputs>
    </Module>
  )
}

export default PowShaperNode
