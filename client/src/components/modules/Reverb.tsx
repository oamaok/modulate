import { Component } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { Reverb } from '@modulate/worklets/src/modules'
type Props = {
  id: string
}

class ReverbNode extends Component<Props> {
  constructor(props: Props) {
    super(props)
    engine.createModule(props.id, 'Reverb')
  }

  render({ id }: Props) {
    return (
      <Module id={id} type="Reverb">
        <Knob<Reverb, 'delay'>
          moduleId={id}
          param={0}
          label="DELAY"
          type="linear"
          min={0}
          max={0.2}
          initial={0.1}
        />
        <Knob<Reverb, 'decay'>
          moduleId={id}
          param={1}
          label="DECAY"
          type="linear"
          min={0}
          max={0.99}
          initial={0.6}
        />
        <Knob<Reverb, 'diffuse'>
          moduleId={id}
          param={2}
          label="DIFFUSE"
          type="linear"
          min={0}
          max={1}
          initial={0.7}
        />
        <Knob<Reverb, 'wet'>
          moduleId={id}
          param={3}
          label="WET"
          type="linear"
          min={0}
          max={1}
          initial={0.5}
        />
        <Knob<Reverb, 'dry'>
          moduleId={id}
          param={4}
          label="DRY"
          type="linear"
          min={0}
          max={1}
          initial={1}
        />
        <ModuleInputs>
          <Socket<Reverb, 'input', 'input'>
            moduleId={id}
            type="input"
            label="IN"
            index={0}
          />
          <Socket<Reverb, 'parameter', 'delay'>
            moduleId={id}
            type="parameter"
            label="DLY"
            index={0}
          />
          <Socket<Reverb, 'parameter', 'decay'>
            moduleId={id}
            type="parameter"
            label="DCY"
            index={1}
          />
          <Socket<Reverb, 'parameter', 'diffuse'>
            moduleId={id}
            type="parameter"
            label="DFS"
            index={2}
          />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket<Reverb, 'output', 'output'>
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

export default ReverbNode
