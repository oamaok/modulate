import { Component } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import { connectKnobToParam } from '../../modules'
import css from './Mixer.css'

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

    connectKnobToParam<Mixer, 'level0'>(props.id, 'busLevel0', 0)
    connectKnobToParam<Mixer, 'level1'>(props.id, 'busLevel1', 1)
    connectKnobToParam<Mixer, 'level2'>(props.id, 'busLevel2', 2)
    connectKnobToParam<Mixer, 'level3'>(props.id, 'busLevel3', 3)
    connectKnobToParam<Mixer, 'level4'>(props.id, 'busLevel4', 4)
    connectKnobToParam<Mixer, 'level5'>(props.id, 'busLevel5', 5)
    connectKnobToParam<Mixer, 'level6'>(props.id, 'busLevel6', 6)
    connectKnobToParam<Mixer, 'level7'>(props.id, 'busLevel7', 7)
  }

  render({ id }: Props) {
    return (
      <Module id={id} type="Mixer">
        <div className={css('mixer')}>
          <Slider
            moduleId={id}
            id="busLevel0"
            label="Bus 1"
            min={0}
            max={1}
            initial={0.8}
          />
          <Slider
            moduleId={id}
            id="busLevel1"
            label="Bus 2"
            min={0}
            max={1}
            initial={0.8}
          />
          <Slider
            moduleId={id}
            id="busLevel2"
            label="Bus 3"
            min={0}
            max={1}
            initial={0.8}
          />
          <Slider
            moduleId={id}
            id="busLevel3"
            label="Bus 4"
            min={0}
            max={1}
            initial={0.8}
          />
          <Slider
            moduleId={id}
            id="busLevel4"
            label="Bus 5"
            min={0}
            max={1}
            initial={0.8}
          />
          <Slider
            moduleId={id}
            id="busLevel5"
            label="Bus 6"
            min={0}
            max={1}
            initial={0.8}
          />
          <Slider
            moduleId={id}
            id="busLevel6"
            label="Bus 7"
            min={0}
            max={1}
            initial={0.8}
          />
          <Slider
            moduleId={id}
            id="busLevel7"
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
