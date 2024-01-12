import { Component } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { FDNReverb } from '@modulate/worklets/src/modules'
import * as styles from './FDNReverb.css'

type Props = {
  id: string
}

class FDNReverbNode extends Component<Props> {
  constructor(props: Props) {
    super(props)
    engine.createModule(props.id, 'FDNReverb')
  }

  render({ id }: Props) {
    return (
      <Module id={id} type="FDNReverb">
        <div class={styles.reverb}>
          <Knob<FDNReverb, 'dryWet'>
            moduleId={id}
            param={0}
            label="DRY/WET"
            type="linear"
            min={0}
            max={1.0}
            initial={0.5}
          />
          <Knob<FDNReverb, 'modSpeed'>
            moduleId={id}
            param={2}
            label="MOD SPD"
            type="linear"
            min={0}
            max={1.0}
            initial={0.5}
          />
          <Knob<FDNReverb, 'modAmount'>
            moduleId={id}
            param={1}
            label="MOD AMT"
            type="linear"
            min={0}
            max={1.0}
            initial={0.5}
          />
          <Knob<FDNReverb, 'decay'>
            moduleId={id}
            param={3}
            label="DECAY"
            type="linear"
            min={0.3}
            max={0.495}
            initial={0.48}
          />
        </div>
        <ModuleInputs>
          <Socket<FDNReverb, 'input', 'input'>
            moduleId={id}
            type="input"
            index={0}
            label="IN"
          />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket<FDNReverb, 'output', 'output'>
            moduleId={id}
            type="output"
            index={0}
            label="OUT"
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default FDNReverbNode
