import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { Oscillator } from '@modulate/worklets/src/modules'
type Props = {
  id: string
}

const OscillatorNode = ({ id }: Props) => {
  return (
    <Module id={id} type="Oscillator">
      <Knob<Oscillator, 'cv'>
        moduleId={id}
        param={0}
        label="CV"
        type="linear"
        min={-5}
        max={5}
        initial={0}
      />
      <Knob<Oscillator, 'fm'>
        moduleId={id}
        param={1}
        label="FM"
        type="linear"
        min={-1}
        max={1}
        initial={0}
      />
      <Knob<Oscillator, 'fine'>
        moduleId={id}
        param={3}
        label="FINE"
        type="linear"
        min={-1}
        max={1}
        initial={0}
      />
      <Knob<Oscillator, 'pw'>
        moduleId={id}
        param={2}
        label="PW"
        type="percentage"
        initial={0.5}
      />
      <Knob<Oscillator, 'level'>
        moduleId={id}
        param={4}
        label="LVL"
        type="linear"
        min={-2}
        max={2}
        initial={1}
      />

      <ModuleInputs>
        <Socket<Oscillator, 'parameter', 'cv'>
          moduleId={id}
          type="parameter"
          index={0}
          label="CV"
        />
        <Socket<Oscillator, 'parameter', 'fm'>
          moduleId={id}
          type="parameter"
          index={1}
          label="FM"
        />
        <Socket<Oscillator, 'parameter', 'pw'>
          moduleId={id}
          type="parameter"
          index={2}
          label="PW"
        />
        <Socket<Oscillator, 'input', 'sync'>
          moduleId={id}
          type="input"
          index={0}
          label="SYNC"
        />
      </ModuleInputs>

      <ModuleOutputs>
        <Socket<Oscillator, 'output', 'sin'>
          moduleId={id}
          type="output"
          index={0}
          label="SIN"
        />
        <Socket<Oscillator, 'output', 'tri'>
          moduleId={id}
          type="output"
          index={1}
          label="TRI"
        />
        <Socket<Oscillator, 'output', 'saw'>
          moduleId={id}
          type="output"
          index={2}
          label="SAW"
        />
        <Socket<Oscillator, 'output', 'sqr'>
          moduleId={id}
          type="output"
          index={3}
          label="SQR"
        />
      </ModuleOutputs>
    </Module>
  )
}

export default OscillatorNode
