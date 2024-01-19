import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { Limiter } from '@modulate/worklets/src/modules'

type Props = {
  id: string
}

const LimiterNode = ({ id }: Props) => {
  return (
    <Module id={id} type="Limiter">
      <Knob<Limiter, 'threshold'>
        moduleId={id}
        param={0}
        type="percentage"
        initial={0.4}
      />
      <ModuleInputs>
        <Socket<Limiter, 'parameter', 'threshold'>
          moduleId={id}
          type="parameter"
          label="THRES"
          index={0}
        />
        <Socket<Limiter, 'input', 'input'>
          moduleId={id}
          type="input"
          label="IN"
          index={0}
        />
      </ModuleInputs>
      <ModuleOutputs>
        <Socket<Limiter, 'output', 'output'>
          moduleId={id}
          type="output"
          label="OUT"
          index={0}
        />
      </ModuleOutputs>
    </Module>
  )
}

export default LimiterNode
