import { h, Component, useEffect } from 'kaiku'
import { IModule } from '../../types'
import { getAudioContext } from '../../audio'
import { WorkletNode } from '../../worklets'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { connectKnobToParam } from '../../modules'

import { ModuleOutputs } from '../module-parts/ModuleSockets'
import { getModuleState, setModuleState } from '../../state'
import { ClockMessage } from '@modulate/common/types'

import css from './Clock.css'
import Toggle from '../module-parts/Toggle'

type Props = {
  id: string
}

const RATIO_OPTIONS = [
  { label: '1/6x', value: 1 / 6 },
  { label: '1/5x', value: 0.2 },
  { label: '1/4x', value: 0.25 },
  { label: '1/3x', value: 1 / 3 },
  { label: '1/2x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '1.5x', value: 1.5 },
  { label: '2x', value: 2 },
  { label: '2.5x', value: 2.5 },
  { label: '3x', value: 3 },
  { label: '4x', value: 4 },
  { label: '5x', value: 5 },
  { label: '6x', value: 6 },
  { label: '7x', value: 7 },
  { label: '8x', value: 8 },
  { label: '9x', value: 9 },
  { label: '10x', value: 10 },
  { label: '11x', value: 11 },
  { label: '12x', value: 12 },
  { label: '13x', value: 13 },
  { label: '14x', value: 14 },
  { label: '15x', value: 15 },
  { label: '16x', value: 16 },
]

type ClockState = {
  isRunning: boolean
}

class Clock extends Component<Props> implements IModule {
  node: WorkletNode<'Clock'>

  sendToClock = (message: ClockMessage) => {
    this.node.port.postMessage(message)
  }
  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()
    this.node = new WorkletNode(audioContext, 'Clock', {
      numberOfOutputs: 4,
    })

    if (!getModuleState<ClockState>(props.id)) {
      setModuleState(props.id, {
        isRunning: false,
      })
    }

    useEffect(() => {
      const { isRunning } = getModuleState<ClockState>(props.id)
      this.sendToClock({
        type: 'SET_RUNNING',
        isRunning,
      })
    })

    const tempo = this.node.parameters.get('tempo')

    const pulseWidth1 = this.node.parameters.get('pulseWidth1')
    const pulseWidth2 = this.node.parameters.get('pulseWidth2')
    const pulseWidth3 = this.node.parameters.get('pulseWidth3')
    const ratio1 = this.node.parameters.get('ratio1')
    const ratio2 = this.node.parameters.get('ratio2')
    const ratio3 = this.node.parameters.get('ratio3')
    const swing1 = this.node.parameters.get('swing1')
    const swing2 = this.node.parameters.get('swing2')
    const swing3 = this.node.parameters.get('swing3')

    connectKnobToParam(props.id, 'tempo', tempo)
    connectKnobToParam(props.id, 'pulseWidth1', pulseWidth1)
    connectKnobToParam(props.id, 'pulseWidth2', pulseWidth2)
    connectKnobToParam(props.id, 'pulseWidth3', pulseWidth3)

    connectKnobToParam(props.id, 'ratio1', ratio1)
    connectKnobToParam(props.id, 'ratio2', ratio2)
    connectKnobToParam(props.id, 'ratio3', ratio3)

    connectKnobToParam(props.id, 'swing1', swing1)
    connectKnobToParam(props.id, 'swing2', swing2)
    connectKnobToParam(props.id, 'swing3', swing3)
  }

  render({ id }: Props) {
    const moduleState = getModuleState<ClockState>(id)
    return (
      <Module id={id} name="Clock" height={260}>
        <div className={css('controls')}>
          <Toggle
            active={moduleState.isRunning}
            onChange={() => {
              moduleState.isRunning = !moduleState.isRunning
            }}
            label="Running"
          />
          <button
            onClick={() => {
              this.sendToClock({ type: 'RESET' })
            }}
          >
            Reset
          </button>
        </div>
        <Knob
          moduleId={id}
          id="tempo"
          label="Tempo"
          type="linear"
          min={1}
          max={500}
          initial={128}
        />
        <div className={css('row')}>
          <Knob
            moduleId={id}
            id="ratio1"
            label="Ratio"
            type="option"
            options={RATIO_OPTIONS}
            initial={1}
          />
          <div className={css('connector')} />
          <Knob
            moduleId={id}
            id="swing1"
            label="Swing"
            type="percentage"
            initial={0.5}
          />
          <div className={css('connector')} />
          <Knob
            moduleId={id}
            id="pulseWidth1"
            label="PW"
            type="percentage"
            initial={0.5}
          />
        </div>
        <div className={css('row')}>
          <Knob
            moduleId={id}
            id="ratio2"
            label="Ratio"
            type="option"
            options={RATIO_OPTIONS}
            initial={1}
          />
          <div className={css('connector')} />
          <Knob
            moduleId={id}
            id="swing2"
            label="Swing"
            type="percentage"
            initial={0.5}
          />
          <div className={css('connector')} />
          <Knob
            moduleId={id}
            id="pulseWidth2"
            label="PW"
            type="percentage"
            initial={0.5}
          />
        </div>
        <div className={css('row')}>
          <Knob
            moduleId={id}
            id="ratio3"
            label="Ratio"
            type="option"
            options={RATIO_OPTIONS}
            initial={1}
          />
          <div className={css('connector')} />
          <Knob
            moduleId={id}
            id="swing3"
            label="Swing"
            type="percentage"
            initial={0.5}
          />
          <div className={css('connector')} />
          <Knob
            moduleId={id}
            id="pulseWidth3"
            label="PW"
            type="percentage"
            initial={0.5}
          />
        </div>
        <ModuleOutputs>
          <Socket
            moduleId={id}
            type="output"
            name="1"
            node={this.node}
            output={0}
          />
          <Socket
            moduleId={id}
            type="output"
            name="2"
            node={this.node}
            output={1}
          />
          <Socket
            moduleId={id}
            type="output"
            name="3"
            node={this.node}
            output={2}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default Clock
