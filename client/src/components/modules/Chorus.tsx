import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import Knob from '../module-parts/Knob'
import { Chorus } from '@modulate/worklets/src/modules'
type Props = {
  id: string
}

const ChorusNode = ({ id }: Props) => {
  return (
    <Module id={id} type="Chorus" name="Chorus">
      <Knob<Chorus, 'dryWet'>
        moduleId={id}
        type="percentage"
        param={0}
        label="DRY/WET"
        initial={0.75}
      />
      <Knob<Chorus, 'rate'>
        moduleId={id}
        type="percentage"
        param={1}
        label="RATE"
        initial={0.75}
      />
      <Knob<Chorus, 'depth'>
        moduleId={id}
        type="percentage"
        param={2}
        label="DEPTH"
        initial={0.75}
      />
      <Knob<Chorus, 'stereoPhase'>
        moduleId={id}
        type="percentage"
        param={3}
        label="STEREO PHASE"
        initial={0.75}
      />
      <Knob<Chorus, 'feedback'>
        moduleId={id}
        type="percentage"
        param={4}
        label="FEEDBACK"
        initial={0.75}
      />
      <ModuleInputs>
        <Socket<Chorus, 'input', 'input'>
          moduleId={id}
          type="input"
          label=""
          index={0}
        />
      </ModuleInputs>
      <ModuleOutputs>
        <Socket<Chorus, 'output', 'outputLeft'>
          moduleId={id}
          type="output"
          label="L"
          index={0}
        />
        <Socket<Chorus, 'output', 'outputRight'>
          moduleId={id}
          type="output"
          label="R"
          index={1}
        />
      </ModuleOutputs>
    </Module>
  )
}

export default ChorusNode
