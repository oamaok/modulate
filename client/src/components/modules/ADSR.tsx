import { Component, useEffect, useRef } from 'kaiku'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { ADSR } from '@modulate/worklets/src/modules'
import { getKnobValue } from '../../state'
import assert from '../../assert'
import * as styles from './ADSR.css'
import moduleConfig from '../../module-config'

type Props = {
  id: string
}

const tensionInterp = (
  start: number,
  end: number,
  tension: number,
  t: number
) => {
  let c = 0
  if (tension > 0.0) {
    let exp = tension * 2.0 + 1.0
    c = 1.0 - Math.pow(1.0 - Math.pow(t, exp), 1.0 / exp)
  } else {
    let exp = 1.0 - tension * 2.0
    c = Math.pow(1.0 - Math.pow(1.0 - t, exp), 1.0 / exp)
  }

  return start + (end - start) * c
}

const CURVE_WIDTH = 190
const CURVE_HEIGHT = 50
const CURVE_PADDING = 8

class ADSRNode extends Component<Props> {
  canvasRef = useRef<HTMLCanvasElement>()

  constructor(props: Props) {
    super(props)

    useEffect(() => {
      const attack = getKnobValue<ADSR, 'attack'>(props.id, 0) ?? 0
      const decay = getKnobValue<ADSR, 'decay'>(props.id, 1) ?? 0
      const sustain = getKnobValue<ADSR, 'sustain'>(props.id, 2) ?? 0
      const release = getKnobValue<ADSR, 'release'>(props.id, 3) ?? 0
      const attackTension =
        getKnobValue<ADSR, 'attackTension'>(props.id, 4) ?? 0
      const decayTension = getKnobValue<ADSR, 'decayTension'>(props.id, 5) ?? 0
      const releaseTension =
        getKnobValue<ADSR, 'releaseTension'>(props.id, 6) ?? 0

      this.renderCurve(
        attack,
        decay,
        sustain,
        release,
        attackTension,
        decayTension,
        releaseTension
      )
    })
  }

  renderCurve = (
    attack: number,
    decay: number,
    sustain: number,
    release: number,
    attackTension: number,
    decayTension: number,
    releaseTension: number
  ) => {
    const canvas = this.canvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    assert(context)

    context.resetTransform()
    context.clearRect(
      0,
      0,
      CURVE_WIDTH + 1 + CURVE_PADDING * 2,
      CURVE_HEIGHT + 1 + CURVE_PADDING * 2
    )

    const DEFAULT_LENGTH = 1.5
    const SUSTAIN_LENGTH = 0.2

    const displayLength = Math.max(
      DEFAULT_LENGTH,
      attack + decay + release + SUSTAIN_LENGTH
    )

    context.strokeStyle = moduleConfig.ADSR.colors.primary
    context.fillStyle = moduleConfig.ADSR.colors.darker
    context.lineWidth = 2

    context.translate(CURVE_PADDING, CURVE_PADDING)

    // Attack curve
    const attackEnd = Math.floor((attack / displayLength) * CURVE_WIDTH)
    const attackYPoints = []
    for (let x = 0; x < attackEnd; x++) {
      attackYPoints[x] =
        tensionInterp(0.0, 1.0, attackTension, x / attackEnd) * CURVE_HEIGHT
    }

    context.beginPath()
    context.moveTo(0, CURVE_HEIGHT)
    for (let x = 0; x < attackEnd; x++) {
      context.lineTo(x, CURVE_HEIGHT - attackYPoints[x]!)
    }
    context.lineTo(attackEnd, 1.0)
    context.lineTo(attackEnd, CURVE_HEIGHT)
    context.fill()

    context.beginPath()
    context.moveTo(0, CURVE_HEIGHT)
    for (let x = 0; x < attackEnd; x++) {
      context.lineTo(x, CURVE_HEIGHT - attackYPoints[x]!)
    }
    context.lineTo(attackEnd, 1.0)
    context.stroke()

    // Decay curve
    const decayStart = attackEnd
    const decayEnd =
      decayStart + Math.floor((decay / displayLength) * CURVE_WIDTH)
    const decayLen = decayEnd - decayStart
    const decayYPoints = []
    for (let x = decayStart; x < decayEnd; x++) {
      decayYPoints[x] =
        tensionInterp(1.0, sustain, decayTension, (x - decayStart) / decayLen) *
        CURVE_HEIGHT
    }

    context.beginPath()
    context.moveTo(decayStart, 0)
    for (let x = decayStart; x < decayEnd; x++) {
      context.lineTo(x, CURVE_HEIGHT - decayYPoints[x]!)
    }
    context.lineTo(decayEnd, (1 - sustain) * CURVE_HEIGHT)
    context.lineTo(decayEnd, CURVE_HEIGHT)
    context.lineTo(decayStart, CURVE_HEIGHT)
    context.fill()

    context.beginPath()
    context.moveTo(decayStart, 0)
    for (let x = 0; x < decayEnd; x++) {
      context.lineTo(x, CURVE_HEIGHT - decayYPoints[x]!)
    }
    context.lineTo(decayEnd, (1 - sustain) * CURVE_HEIGHT)
    context.stroke()

    // Sustain
    const sustainStart = decayEnd
    const sustainEnd =
      sustainStart + Math.floor((SUSTAIN_LENGTH / displayLength) * CURVE_WIDTH)

    context.beginPath()
    context.moveTo(sustainStart, (1 - sustain) * CURVE_HEIGHT)
    context.lineTo(sustainEnd, (1 - sustain) * CURVE_HEIGHT)
    context.lineTo(sustainEnd, CURVE_HEIGHT)
    context.lineTo(sustainStart, CURVE_HEIGHT)
    context.fill()

    context.beginPath()
    context.moveTo(sustainStart, (1 - sustain) * CURVE_HEIGHT)
    context.lineTo(sustainEnd, (1 - sustain) * CURVE_HEIGHT)
    context.setLineDash([2, 2])
    context.stroke()
    context.setLineDash([])

    // Release curve
    const releaseStart = sustainEnd
    const releaseEnd =
      releaseStart + Math.floor((release / displayLength) * CURVE_WIDTH)
    const releaseLen = releaseEnd - releaseStart
    const releaseYPoints = []
    for (let x = releaseStart; x < releaseEnd; x++) {
      releaseYPoints[x] =
        tensionInterp(
          sustain,
          0.0,
          releaseTension,
          (x - releaseStart) / releaseLen
        ) * CURVE_HEIGHT
    }

    context.beginPath()
    context.moveTo(releaseStart, (1 - sustain) * CURVE_HEIGHT)
    for (let x = releaseStart; x < releaseEnd; x++) {
      context.lineTo(x, CURVE_HEIGHT - releaseYPoints[x]!)
    }
    context.lineTo(releaseEnd, CURVE_HEIGHT)
    context.lineTo(releaseEnd, CURVE_HEIGHT)
    context.lineTo(releaseStart, CURVE_HEIGHT)
    context.fill()

    context.beginPath()
    context.moveTo(releaseStart, (1 - sustain) * CURVE_HEIGHT)
    for (let x = 0; x < releaseEnd; x++) {
      context.lineTo(x, CURVE_HEIGHT - releaseYPoints[x]!)
    }
    context.lineTo(releaseEnd, CURVE_HEIGHT)
    context.stroke()

    context.resetTransform()

    context.fillStyle = '#666'
    context.fillRect(
      0,
      CURVE_HEIGHT + CURVE_PADDING,
      CURVE_WIDTH + CURVE_PADDING * 2,
      2
    )

    context.fillStyle = '#222'
    context.fillRect(
      0,
      CURVE_HEIGHT + CURVE_PADDING + 2,
      CURVE_WIDTH + CURVE_PADDING * 2,
      CURVE_PADDING
    )
  }

  render({ id }: Props) {
    return (
      <Module id={id} type="ADSR">
        <div class={styles.adsr}>
          <div class={styles.curve}>
            <canvas
              width={CURVE_WIDTH + CURVE_PADDING * 2}
              height={CURVE_HEIGHT + CURVE_PADDING * 2}
              ref={this.canvasRef}
            ></canvas>
          </div>
          <div class={styles.knobs}>
            <div class={styles.knobGroup}>
              <div class={styles.label}>ATT</div>
              <Knob<ADSR, 'attack'>
                moduleId={id}
                type="exponential"
                param={0}
                label="Attack time"
                hideLabel
                unit="s"
                exponent={2}
                min={0.001}
                max={10}
                initial={0.1}
              />
              <Knob<ADSR, 'attackTension'>
                moduleId={id}
                type="linear"
                param={4}
                label="Attack tension"
                hideLabel
                unit=""
                min={-1}
                max={1}
                initial={0}
              />
            </div>
            <div class={styles.separator} />
            <div class={styles.knobGroup}>
              <div class={styles.label}>DCY</div>
              <Knob<ADSR, 'decay'>
                moduleId={id}
                type="exponential"
                param={1}
                label="Decay time"
                hideLabel
                unit="s"
                exponent={2}
                min={0.001}
                max={10}
                initial={0.1}
              />
              <Knob<ADSR, 'decayTension'>
                moduleId={id}
                type="linear"
                param={5}
                label="Decay tension"
                hideLabel
                unit=""
                min={-1}
                max={1}
                initial={0}
              />
            </div>
            <div class={styles.separator} />
            <div class={styles.knobGroup}>
              <div class={styles.label}>SUS</div>
              <Knob<ADSR, 'sustain'>
                moduleId={id}
                type="linear"
                param={2}
                label="Sustain level"
                hideLabel
                unit="s"
                min={0}
                max={1}
                initial={0.5}
              />
            </div>
            <div class={styles.separator} />
            <div class={styles.knobGroup}>
              <div class={styles.label}>REL</div>
              <Knob<ADSR, 'release'>
                moduleId={id}
                type="exponential"
                param={3}
                label="Release time"
                hideLabel
                unit="s"
                exponent={2}
                min={0.001}
                max={10}
                initial={0.1}
              />
              <Knob<ADSR, 'releaseTension'>
                moduleId={id}
                type="linear"
                param={6}
                label="Release tension"
                hideLabel
                unit=""
                min={-1}
                max={1}
                initial={0}
              />
            </div>
            <div class={styles.separator} />
            <div class={styles.knobGroup}>
              <div class={styles.label}>AMT</div>
              <Knob<ADSR, 'amount'>
                moduleId={id}
                type="linear"
                param={7}
                label="Amount"
                hideLabel
                min={-5}
                max={5}
                initial={1}
              />
            </div>
          </div>
        </div>
        <ModuleInputs>
          <Socket<ADSR, 'input', 'gate'>
            moduleId={id}
            type="input"
            label="GATE"
            index={0}
          />
          <Socket<ADSR, 'parameter', 'attack'>
            moduleId={id}
            type="parameter"
            label="ATT"
            index={0}
          />
          <Socket<ADSR, 'parameter', 'decay'>
            moduleId={id}
            type="parameter"
            label="DCY"
            index={1}
          />
          <Socket<ADSR, 'parameter', 'sustain'>
            moduleId={id}
            type="parameter"
            label="SUS"
            index={2}
          />
          <Socket<ADSR, 'parameter', 'release'>
            moduleId={id}
            type="parameter"
            label="REL"
            index={3}
          />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket<ADSR, 'output', 'envelope'>
            moduleId={id}
            type="output"
            label="ENV"
            index={0}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default ADSRNode
