import { h, Component, useEffect } from 'kaiku'
import { IModule } from '../../types'
import { getAudioContext } from '../../audio'
import { WorkletNode } from '../../worklets'
import { getModuleKnobs } from '../../state'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { connectKnobToParam } from '../../modules'
import classNames from 'classnames/bind'
import styles from './Mixer.css'

const css = classNames.bind(styles)

import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
type Props = {
  id: string
}

class Mixer extends Component<Props> implements IModule {
  node: WorkletNode<'Mixer'>

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()
    this.node = new WorkletNode(audioContext, 'Mixer', {
      numberOfInputs: 8,
    })
    const busLevel0 = this.node.parameters.get('busLevel0')
    const busLevel1 = this.node.parameters.get('busLevel1')
    const busLevel2 = this.node.parameters.get('busLevel2')
    const busLevel3 = this.node.parameters.get('busLevel3')
    const busLevel4 = this.node.parameters.get('busLevel4')
    const busLevel5 = this.node.parameters.get('busLevel5')
    const busLevel6 = this.node.parameters.get('busLevel6')
    const busLevel7 = this.node.parameters.get('busLevel7')
    const mainLevel = this.node.parameters.get('mainLevel')

    connectKnobToParam(props.id, 'busLevel0', busLevel0)
    connectKnobToParam(props.id, 'busLevel1', busLevel1)
    connectKnobToParam(props.id, 'busLevel2', busLevel2)
    connectKnobToParam(props.id, 'busLevel3', busLevel3)
    connectKnobToParam(props.id, 'busLevel4', busLevel4)
    connectKnobToParam(props.id, 'busLevel5', busLevel5)
    connectKnobToParam(props.id, 'busLevel6', busLevel6)
    connectKnobToParam(props.id, 'busLevel7', busLevel7)
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Mixer" width={120} height={400}>
        <div className={css('mixer')}>
          <Knob moduleId={id} name="busLevel0" min={0} max={1} initial={0.8} />
          <Knob moduleId={id} name="busLevel1" min={0} max={1} initial={0.8} />
          <Knob moduleId={id} name="busLevel2" min={0} max={1} initial={0.8} />
          <Knob moduleId={id} name="busLevel3" min={0} max={1} initial={0.8} />
          <Knob moduleId={id} name="busLevel4" min={0} max={1} initial={0.8} />
          <Knob moduleId={id} name="busLevel5" min={0} max={1} initial={0.8} />
          <Knob moduleId={id} name="busLevel6" min={0} max={1} initial={0.8} />
          <Knob moduleId={id} name="busLevel7" min={0} max={1} initial={0.8} />
        </div>
        <ModuleInputs>
          <Socket
            moduleId={id}
            type="input"
            name="Bus 1"
            input={0}
            node={this.node}
          />
          <Socket
            moduleId={id}
            type="input"
            name="Bus 2"
            input={1}
            node={this.node}
          />
          <Socket
            moduleId={id}
            type="input"
            name="Bus 3"
            input={2}
            node={this.node}
          />
          <Socket
            moduleId={id}
            type="input"
            name="Bus 4"
            input={3}
            node={this.node}
          />
          <Socket
            moduleId={id}
            type="input"
            name="Bus 5"
            input={4}
            node={this.node}
          />
          <Socket
            moduleId={id}
            type="input"
            name="Bus 6"
            input={5}
            node={this.node}
          />
          <Socket
            moduleId={id}
            type="input"
            name="Bus 7"
            input={6}
            node={this.node}
          />
          <Socket
            moduleId={id}
            type="input"
            name="Bus 8"
            input={7}
            node={this.node}
          />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket
            moduleId={id}
            type="output"
            name="Out"
            output={0}
            node={this.node}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default Mixer
