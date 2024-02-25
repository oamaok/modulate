import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { EQ3 } from '@modulate/worklets/src/modules'
import * as styles from './EQ3.css'

type Props = {
  id: string
}

const EQ3Node = ({ id }: Props) => {
  return (
    <Module id={id} type="EQ3">
      <div class={styles.knobs}>
        <div class={styles.knobGroup}>
          <div class={styles.label}>LOW</div>
          <Knob<EQ3, 'lowshelfFreq'>
            moduleId={id}
            param={0}
            label="FREQ"
            type="linear"
            min={-4}
            max={4}
            initial={0}
          />
          <Knob<EQ3, 'lowshelfSlope'>
            moduleId={id}
            param={1}
            label="SLOPE"
            type="linear"
            min={0}
            max={1}
            initial={0.5}
          />
          <Knob<EQ3, 'lowshelfGain'>
            moduleId={id}
            param={2}
            label="GAIN"
            type="linear"
            min={-20}
            max={20}
            initial={0}
          />
        </div>
        <div class={styles.separator} />
        <div class={styles.knobGroup}>
          <div class={styles.label}>PEAK</div>
          <Knob<EQ3, 'peakingFreq'>
            moduleId={id}
            param={6}
            label="FREQ"
            type="linear"
            min={-4}
            max={4}
            initial={0}
          />
          <Knob<EQ3, 'peakingSlope'>
            moduleId={id}
            param={7}
            label="SLOPE"
            type="linear"
            min={0}
            max={10}
            initial={0.5}
          />
          <Knob<EQ3, 'peakingGain'>
            moduleId={id}
            param={8}
            label="GAIN"
            type="linear"
            min={-20}
            max={20}
            initial={0}
          />
        </div>
        <div class={styles.separator} />
        <div class={styles.knobGroup}>
          <div class={styles.label}>HIGH</div>
          <Knob<EQ3, 'highshelfFreq'>
            moduleId={id}
            param={3}
            label="FREQ"
            type="linear"
            min={-4}
            max={4}
            initial={0}
          />
          <Knob<EQ3, 'highshelfSlope'>
            moduleId={id}
            param={4}
            label="SLOPE"
            type="linear"
            min={0}
            max={1}
            initial={0.5}
          />
          <Knob<EQ3, 'highshelfGain'>
            moduleId={id}
            param={5}
            label="GAIN"
            type="linear"
            min={-20}
            max={20}
            initial={0}
          />
        </div>
      </div>
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
