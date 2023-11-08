import { Component } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { LFO } from '@modulate/worklets/src/modules'

type Props = {
  id: string
}

class LFONode extends Component<Props> {
  node: OscillatorNode

  constructor(props: Props) {
    super(props)
    engine.createModule(props.id, 'LFO')
  }

  render({ id }: Props) {
    return (
      <Module id={id} type="LFO">
        <Knob<LFO, 'cv'>
          moduleId={id}
          param={0}
          label="FREQ"
          type="linear"
          min={0}
          max={10}
          initial={1}
        />
        <Knob<LFO, 'pw'>
          moduleId={id}
          param={1}
          label="PW"
          type="linear"
          min={0}
          max={1}
          initial={0.5}
        />
        <Knob<LFO, 'amount'>
          moduleId={id}
          param={2}
          label="AMOUNT"
          type="percentage"
          initial={1.0}
        />

        <ModuleInputs>
          <Socket<LFO, 'parameter', 'cv'>
            moduleId={id}
            type="parameter"
            index={0}
            label="FREQ"
          />
          <Socket<LFO, 'parameter', 'pw'>
            moduleId={id}
            type="parameter"
            index={1}
            label="PW"
          />
          <Socket<LFO, 'input', 'sync'>
            moduleId={id}
            type="input"
            index={0}
            label="SYNC"
          />
        </ModuleInputs>

        <ModuleOutputs>
          <Socket<LFO, 'output', 'sin'>
            moduleId={id}
            type="output"
            index={0}
            label="SIN"
          />
          <Socket<LFO, 'output', 'tri'>
            moduleId={id}
            type="output"
            index={1}
            label="TRI"
          />
          <Socket<LFO, 'output', 'saw'>
            moduleId={id}
            type="output"
            index={2}
            label="SAW"
          />
          <Socket<LFO, 'output', 'sqr'>
            moduleId={id}
            type="output"
            index={3}
            label="SQR"
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default LFONode
