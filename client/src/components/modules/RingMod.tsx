import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { RingMod } from '@modulate/worklets/src/modules'

type Props = {
  id: string
}

const RingModNode = ({ id }: Props) => {
  return (
    <Module id={id} type="RingMod">
      <Knob<RingMod, 'gain'>
        moduleId={id}
        param={0}
        label="GAIN"
        type="linear"
        min={0}
        max={2}
        initial={0.4}
      />
      <ModuleInputs>
        <Socket<RingMod, 'input', 'inputA'>
          moduleId={id}
          type="input"
          index={0}
          label="A"
        />
        <Socket<RingMod, 'input', 'inputB'>
          moduleId={id}
          type="input"
          index={1}
          label="B"
        />
      </ModuleInputs>
      <ModuleOutputs>
        <Socket<RingMod, 'output', 'output'>
          moduleId={id}
          type="output"
          index={0}
          label="OUT"
        />
      </ModuleOutputs>
    </Module>
  )
}

export default RingModNode
