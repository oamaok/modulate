import { Component, useEffect } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'

import { ModuleOutputs } from '../module-parts/ModuleSockets'
import { getModuleState, setModuleState } from '../../state'

import * as styles from './Clock.css'
import Toggle from '../module-parts/Toggle'
import { Clock } from '@modulate/worklets/src/modules'

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

class ClockNode extends Component<Props> {
  constructor(props: Props) {
    super(props)

    if (!getModuleState<ClockState>(props.id)) {
      setModuleState(props.id, {
        isRunning: false,
      })
    }

    useEffect(() => {
      const { isRunning } = getModuleState<ClockState>(props.id)
      engine.sendMessageToModule<Clock>(props.id, {
        type: 'ClockSetRunning',
        running: isRunning,
      })
    })
  }

  render({ id }: Props) {
    const moduleState = getModuleState<ClockState>(id)
    return (
      <Module id={id} type="Clock">
        <div className={styles.controls}>
          <Toggle
            active={moduleState.isRunning}
            onChange={() => {
              moduleState.isRunning = !moduleState.isRunning
            }}
            label="Running"
          />
          <button
            onClick={() => {
              engine.sendMessageToModule<Clock>(id, {
                type: 'ClockReset',
              })
            }}
          >
            Reset
          </button>
        </div>
        <Knob<Clock, 'tempo'>
          moduleId={id}
          param={0}
          label="TEMPO"
          type="linear"
          min={1}
          max={500}
          initial={128}
        />
        <div className={styles.row}>
          <Knob<Clock, 'ratio0'>
            moduleId={id}
            param={1}
            label="RATIO"
            type="option"
            options={RATIO_OPTIONS}
            initial={1}
          />
          <div className={styles.connector} />
          <Knob<Clock, 'swing0'>
            moduleId={id}
            param={7}
            label="SWING"
            type="percentage"
            initial={0.5}
          />
          <div className={styles.connector} />
          <Knob<Clock, 'pw0'>
            moduleId={id}
            param={4}
            label="PW"
            type="percentage"
            initial={0.5}
          />
        </div>
        <div className={styles.row}>
          <Knob<Clock, 'ratio1'>
            moduleId={id}
            param={2}
            label="RATIO"
            type="option"
            options={RATIO_OPTIONS}
            initial={1}
          />
          <div className={styles.connector} />
          <Knob<Clock, 'swing1'>
            moduleId={id}
            param={8}
            label="SWING"
            type="percentage"
            initial={0.5}
          />
          <div className={styles.connector} />
          <Knob<Clock, 'pw1'>
            moduleId={id}
            param={5}
            label="PW"
            type="percentage"
            initial={0.5}
          />
        </div>
        <div className={styles.row}>
          <Knob<Clock, 'ratio2'>
            moduleId={id}
            param={3}
            label="RATIO"
            type="option"
            options={RATIO_OPTIONS}
            initial={1}
          />
          <div className={styles.connector} />
          <Knob<Clock, 'swing2'>
            moduleId={id}
            param={9}
            label="SWING"
            type="percentage"
            initial={0.5}
          />
          <div className={styles.connector} />
          <Knob<Clock, 'pw2'>
            moduleId={id}
            param={6}
            label="PW"
            type="percentage"
            initial={0.5}
          />
        </div>
        <ModuleOutputs>
          <Socket<Clock, 'output', 'pulse0'>
            moduleId={id}
            type="output"
            label=""
            index={0}
          />
          <Socket<Clock, 'output', 'pulse1'>
            moduleId={id}
            type="output"
            label=""
            index={1}
          />
          <Socket<Clock, 'output', 'pulse2'>
            moduleId={id}
            type="output"
            label=""
            index={2}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default ClockNode
