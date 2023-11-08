import { Component } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import * as styles from './Mixer.css'

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import Slider from '../module-parts/Slider'
import { Mixer } from '@modulate/worklets/src/modules'
type Props = {
  id: string
}

class MixerNode extends Component<Props> {
  constructor(props: Props) {
    super(props)
    engine.createModule(props.id, 'Mixer')
  }

  render({ id }: Props) {
    return (
      <Module id={id} type="Mixer">
        <div className={styles.mixer}>
          <Slider<Mixer, 'level0'>
            moduleId={id}
            param={0}
            label="Bus 1"
            min={0}
            max={1}
            initial={0.8}
          />
          <Slider<Mixer, 'level1'>
            moduleId={id}
            param={1}
            label="Bus 2"
            min={0}
            max={1}
            initial={0.8}
          />
          <Slider<Mixer, 'level2'>
            moduleId={id}
            param={2}
            label="Bus 3"
            min={0}
            max={1}
            initial={0.8}
          />
          <Slider<Mixer, 'level3'>
            moduleId={id}
            param={3}
            label="Bus 4"
            min={0}
            max={1}
            initial={0.8}
          />
          <Slider<Mixer, 'level4'>
            moduleId={id}
            param={4}
            label="Bus 5"
            min={0}
            max={1}
            initial={0.8}
          />
          <Slider<Mixer, 'level5'>
            moduleId={id}
            param={5}
            label="Bus 6"
            min={0}
            max={1}
            initial={0.8}
          />
          <Slider<Mixer, 'level6'>
            moduleId={id}
            param={6}
            label="Bus 7"
            min={0}
            max={1}
            initial={0.8}
          />
          <Slider<Mixer, 'level7'>
            moduleId={id}
            param={7}
            label="Bus 8"
            min={0}
            max={1}
            initial={0.8}
          />
        </div>
        <ModuleInputs>
          <Socket<Mixer, 'input', 'input0'>
            moduleId={id}
            type="input"
            label=""
            index={0}
          />
          <Socket<Mixer, 'input', 'input1'>
            moduleId={id}
            type="input"
            label=""
            index={1}
          />
          <Socket<Mixer, 'input', 'input2'>
            moduleId={id}
            type="input"
            label=""
            index={2}
          />
          <Socket<Mixer, 'input', 'input3'>
            moduleId={id}
            type="input"
            label=""
            index={3}
          />
          <Socket<Mixer, 'input', 'input4'>
            moduleId={id}
            type="input"
            label=""
            index={4}
          />
          <Socket<Mixer, 'input', 'input5'>
            moduleId={id}
            type="input"
            label=""
            index={5}
          />
          <Socket<Mixer, 'input', 'input6'>
            moduleId={id}
            type="input"
            label=""
            index={6}
          />
          <Socket<Mixer, 'input', 'input7'>
            moduleId={id}
            type="input"
            label=""
            index={7}
          />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket<Mixer, 'output', 'output'>
            moduleId={id}
            type="output"
            label=""
            index={0}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default MixerNode
