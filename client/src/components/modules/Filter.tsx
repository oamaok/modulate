import { Component } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { BiquadFilter } from '@modulate/worklets/src/modules'
import * as styles from './Filter.css'

type Props = {
  id: string
}

class BiquadFilterNode extends Component<Props> {
  constructor(props: Props) {
    super(props)
    engine.createModule(props.id, 'BiquadFilter')
  }

  render({ id }: Props) {
    return (
      <Module id={id} type="BiquadFilter" name="Filter">
        <div className={styles.knobs}>
          <div className={styles.knobGroup}>
            <Knob<BiquadFilter, 'frequency'>
              moduleId={id}
              param={0}
              label="FREQ"
              type="linear"
              min={-5}
              max={5}
              initial={0}
            />
            <Knob<BiquadFilter, 'freqModAmount'>
              moduleId={id}
              param={4}
              label="MOD AMT"
              type="linear"
              min={-5}
              max={5}
              initial={1}
            />
          </div>
          <div className={styles.separator} />
          <div className={styles.knobGroup}>
            <Knob<BiquadFilter, 'resonance'>
              moduleId={id}
              param={1}
              label="RES"
              type="linear"
              min={1}
              max={20}
              initial={1}
            />
            <Knob<BiquadFilter, 'resoModAmount'>
              moduleId={id}
              param={5}
              label="MOD AMT"
              type="linear"
              min={-5}
              max={5}
              initial={1}
            />
          </div>
          <div className={styles.separator} />
          <div className={styles.knobGroup}>
            <Knob<BiquadFilter, 'lowpassLevel'>
              moduleId={id}
              param={2}
              label="LP AMT"
              type="linear"
              min={0}
              max={2}
              initial={1}
            />
            <Knob<BiquadFilter, 'highpassLevel'>
              moduleId={id}
              param={3}
              label="HP AMT"
              type="linear"
              min={0}
              max={2}
              initial={1}
            />
          </div>
        </div>
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
