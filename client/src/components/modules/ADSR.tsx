import { Component, useEffect, useRef } from 'kaiku'
import * as engine from '../../engine'
import { connectKnobToParam } from '../../modules'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { ADSR } from '@modulate/worklets/src/modules'
import { getModuleKnobs } from '../../state'
import assert from '../../assert'
import css from './ADSR.css'

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

const CURVE_WIDTH = 160
const CURVE_HEIGHT = 50
const CURVE_PADDING = 8

class ADSRNode extends Component<Props> {
  canvasRef = useRef<HTMLCanvasElement>()

  constructor(props: Props) {
    super(props)

    engine.createModule(props.id, 'ADSR')

    connectKnobToParam<ADSR, 'attack'>(props.id, 'attack', 0)
    connectKnobToParam<ADSR, 'decay'>(props.id, 'decay', 1)
    connectKnobToParam<ADSR, 'sustain'>(props.id, 'sustain', 2)
    connectKnobToParam<ADSR, 'release'>(props.id, 'release', 3)
    connectKnobToParam<ADSR, 'attackTension'>(props.id, 'attackTension', 4)
    connectKnobToParam<ADSR, 'decayTension'>(props.id, 'decayTension', 5)
    connectKnobToParam<ADSR, 'releaseTension'>(props.id, 'releaseTension', 6)

    useEffect(() => {
      const knobs = getModuleKnobs(props.id)
      if (knobs) {
        const {
          attack,
          decay,
          sustain,
          release,
          attackTension,
          decayTension,
          releaseTension,
        } = knobs
        assert(typeof attack !== 'undefined')
        assert(typeof decay !== 'undefined')
        assert(typeof sustain !== 'undefined')
        assert(typeof release !== 'undefined')
        assert(typeof attackTension !== 'undefined')
        assert(typeof decayTension !== 'undefined')
        assert(typeof releaseTension !== 'undefined')

        this.renderCurve(
          attack,
          decay,
          sustain,
          release,
          attackTension,
          decayTension,
          releaseTension
        )
      }
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

    context.strokeStyle = '#e85d00'
    context.fillStyle = '#4b1e00'
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
      <Module id={id} name="ADSR" width={250} height={200}>
        <div className={css('adsr')}>
          <div className={css('curve')}>
            <canvas
              width={CURVE_WIDTH + CURVE_PADDING * 2}
              height={CURVE_HEIGHT + CURVE_PADDING * 2}
              ref={this.canvasRef}
            ></canvas>
          </div>
          <div className={css('knobs')}>
            <div className={css('knob-group')}>
              <div className={css('label')}>ATT</div>
              <Knob
                moduleId={id}
                type="exponential"
                id="attack"
                label="Attack time"
                hideLabel
                unit="s"
                exponent={2}
                min={0.001}
                max={10}
                initial={0.1}
              />
              <Knob
                moduleId={id}
                type="linear"
                id="attackTension"
                label="Attack tension"
                hideLabel
                unit=""
                min={-1}
                max={1}
                initial={0}
              />
            </div>
            <div className={css('separator')} />
            <div className={css('knob-group')}>
              <div className={css('label')}>DCY</div>
              <Knob
                moduleId={id}
                type="exponential"
                id="decay"
                label="Decay time"
                hideLabel
                unit="s"
                exponent={2}
                min={0.001}
                max={10}
                initial={0.1}
              />
              <Knob
                moduleId={id}
                type="linear"
                id="decayTension"
                label="Decay tension"
                hideLabel
                unit=""
                min={-1}
                max={1}
                initial={0}
              />
            </div>
            <div className={css('separator')} />
            <div className={css('knob-group')}>
              <div className={css('label')}>SUS</div>
              <Knob
                moduleId={id}
                type="linear"
                id="sustain"
                label="Sustain level"
                hideLabel
                unit="s"
                min={0}
                max={1}
                initial={0.5}
              />
            </div>
            <div className={css('separator')} />
            <div className={css('knob-group')}>
              <div className={css('label')}>REL</div>
              <Knob
                moduleId={id}
                type="exponential"
                id="release"
                label="Release time"
                hideLabel
                unit="s"
                exponent={2}
                min={0.001}
                max={10}
                initial={0.1}
              />
              <Knob
                moduleId={id}
                type="linear"
                id="releaseTension"
                label="Release tension"
                hideLabel
                unit=""
                min={-1}
                max={1}
                initial={0}
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
