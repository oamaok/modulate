import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { Delay } from '@modulate/worklets/src/modules'
type Props = {
  id: string
}

const DelayNode = ({ id }: Props) => {
  return (
    <Module id={id} type="Delay">
      <Knob<Delay, 'time'>
        moduleId={id}
        param={0}
        label="TIME"
        type="exponential"
        exponent={2}
        unit="s"
        min={0.001}
        max={2}
        initial={0.5}
      />
      <Knob<Delay, 'feedback'>
        moduleId={id}
        param={1}
        label="FDBK"
        type="percentage"
        initial={0.2}
      />
      <Knob<Delay, 'wet'>
        moduleId={id}
        param={2}
        label="WET"
        type="percentage"
        initial={0.5}
      />
      <Knob<Delay, 'dry'>
        moduleId={id}
        param={3}
        label="DRY"
        type="percentage"
        initial={1}
      />
      <ModuleInputs>
        <Socket<Delay, 'parameter', 'feedback'>
          moduleId={id}
          type="parameter"
          label="FDBK"
          index={1}
        />
        <Socket<Delay, 'parameter', 'time'>
          moduleId={id}
          type="parameter"
          label="TIME"
          index={0}
        />
        <Socket<Delay, 'input', 'input'>
          moduleId={id}
          type="input"
          label="IN"
          index={0}
        />
      </ModuleInputs>
      <ModuleOutputs>
        <Socket<Delay, 'output', 'output'>
          moduleId={id}
          type="output"
          label="OUT"
          index={0}
        />
      </ModuleOutputs>
    </Module>
  )
}

export default DelayNode
