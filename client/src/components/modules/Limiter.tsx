import { h, Component, useEffect } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { connectKnobToParam } from '../../modules'
import { Limiter } from '@modulate/worklets/src/modules'

type Props = {
  id: string
}

class LimiterNode extends Component<Props> {
  constructor(props: Props) {
    super(props)
    engine.createModule(props.id, 'Limiter')
    connectKnobToParam<Limiter, 'threshold'>(props.id, 'threshold', 0)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Limiter">
        <Knob moduleId={id} id="THRES" type="percentage" initial={0.4} />
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
}

export default LimiterNode
