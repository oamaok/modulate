import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { EQ3 } from '@modulate/worklets/src/modules'

type Props = {
  id: string
}

const EQ3Node = ({ id }: Props) => {
  return (
    <Module id={id} type="EQ3">
      <Knob<EQ3, 'lowshelfFreq'>
        moduleId={id}
        param={0}
        label="LS FREQ"
        type="linear"
        min={-4}
        max={4}
        initial={0}
      />
      <Knob<EQ3, 'lowshelfSlope'>
        moduleId={id}
        param={1}
        label="LS Q"
        type="linear"
        min={0}
        max={1}
        initial={0.5}
      />
      <Knob<EQ3, 'lowshelfGain'>
        moduleId={id}
        param={2}
        label="LS GAIN"
        type="linear"
        min={-20}
        max={20}
        initial={0}
      />
      <Knob<EQ3, 'peakingFreq'>
        moduleId={id}
        param={6}
        label="PK FREQ"
        type="linear"
        min={-4}
        max={4}
        initial={0}
      />
      <Knob<EQ3, 'peakingSlope'>
        moduleId={id}
        param={7}
        label="PK Q"
        type="linear"
        min={0}
        max={1}
        initial={0.5}
      />
      <Knob<EQ3, 'peakingGain'>
        moduleId={id}
        param={8}
        label="PK GAIN"
        type="linear"
        min={-20}
        max={20}
        initial={0}
      />
      <Knob<EQ3, 'highshelfFreq'>
        moduleId={id}
        param={3}
        label="HS FREQ"
        type="linear"
        min={-4}
        max={4}
        initial={0}
      />
      <Knob<EQ3, 'highshelfSlope'>
        moduleId={id}
        param={4}
        label="HS Q"
        type="linear"
        min={0}
        max={1}
        initial={0.5}
      />
      <Knob<EQ3, 'highshelfGain'>
        moduleId={id}
        param={5}
        label="HS GAIN"
        type="linear"
        min={-20}
        max={20}
        initial={0}
      />
      <ModuleInputs>
        <Socket<EQ3, 'input', 'input'>
          moduleId={id}
          type="input"
          index={0}
          label="IN"
        />
      </ModuleInputs>
      <ModuleOutputs>
        <Socket<EQ3, 'output', 'output'>
          moduleId={id}
          type="output"
          index={0}
          label="OUT"
        />
      </ModuleOutputs>
    </Module>
  )
}

export default EQ3Node
