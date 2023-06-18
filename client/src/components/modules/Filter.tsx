import { h, Component } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { connectKnobToParam } from '../../modules'

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { BiquadFilter } from '@modulate/worklets/src/modules'
type Props = {
  id: string
}

class BiquadFilterNode extends Component<Props> {
  constructor(props: Props) {
    super(props)
    engine.createModule(props.id, 'BiquadFilter')

    connectKnobToParam<BiquadFilter, 'frequency'>(props.id, 'frequency', 0)
    connectKnobToParam<BiquadFilter, 'resonance'>(props.id, 'resonance', 1)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Filter" width={180}>
        <Knob
          moduleId={id}
          id="frequency"
          label="FREQ"
          type="linear"
          min={-5}
          max={5}
          initial={0}
        />
        <Knob
          moduleId={id}
          id="resonance"
          label="RES"
          type="linear"
          min={1}
          max={20}
          initial={1}
        />
        <ModuleInputs>
          <Socket<BiquadFilter, 'input', 'input'>
            moduleId={id}
            type="input"
            index={0}
            label="IN"
          />
          <Socket<BiquadFilter, 'parameter', 'frequency'>
            moduleId={id}
            type="parameter"
            index={0}
            label="FREQ"
          />
          <Socket<BiquadFilter, 'parameter', 'resonance'>
            moduleId={id}
            type="parameter"
            index={1}
            label="RES"
          />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket<BiquadFilter, 'output', 'lowpass'>
            moduleId={id}
            type="output"
            index={0}
            label="LP"
          />
          <Socket<BiquadFilter, 'output', 'highpass'>
            moduleId={id}
            type="output"
            index={1}
            label="HP"
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default BiquadFilterNode
