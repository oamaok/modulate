import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { EQ3 } from '@modulate/worklets/src/modules'
import * as styles from './EQ3.css'
import * as engine from '../../engine'
import * as complex from '@modulate/common/complex'
import { useEffect, useRef } from 'kaiku'
import { getKnobValue } from '../../state'
import assert from '../../assert'
import moduleConfig from '../../module-config'

type Props = {
  id: string
}

const getLowshelfCoefficients = (moduleId: string) => {
  const freq = getKnobValue<EQ3, 'lowshelfFreq'>(moduleId, 0) ?? 0
  const slope = getKnobValue<EQ3, 'lowshelfSlope'>(moduleId, 1) ?? 0
  const gain = getKnobValue<EQ3, 'lowshelfGain'>(moduleId, 2) ?? 0

  return engine.getFilterCoefficients('lowshelf', freq, slope, gain)
}

const getPeakingCoefficients = (moduleId: string) => {
  const freq = getKnobValue<EQ3, 'peakingFreq'>(moduleId, 6) ?? 0
  const slope = getKnobValue<EQ3, 'peakingSlope'>(moduleId, 7) ?? 0
  const gain = getKnobValue<EQ3, 'peakingGain'>(moduleId, 8) ?? 0

  return engine.getFilterCoefficients('peaking', freq, slope, gain)
}

const getHighshelfCoefficients = (moduleId: string) => {
  const freq = getKnobValue<EQ3, 'highshelfFreq'>(moduleId, 3) ?? 0
  const slope = getKnobValue<EQ3, 'highshelfSlope'>(moduleId, 4) ?? 0
  const gain = getKnobValue<EQ3, 'highshelfGain'>(moduleId, 5) ?? 0

  return engine.getFilterCoefficients('highshelf', freq, slope, gain)
}

const CANVAS_WIDTH = 206
const CANVAS_HEIGHT = 110

const voltageToFreq = (voltage: number): number => {
  return 13.75 * 2 ** (voltage + 5)
}

const EQ3Node = ({ id }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    assert(context)

    const lowshelf = getLowshelfCoefficients(id)
    const peaking = getPeakingCoefficients(id)
    const highshelf = getHighshelfCoefficients(id)

    const freqResponses = Array(3)
      .fill(null)
      .map(() => []) as number[][]

    let filters = [lowshelf, peaking, highshelf]

    for (let i = 0; i < CANVAS_WIDTH; i++) {
      const x = (i / CANVAS_WIDTH) ** 2 * Math.PI
      const z = complex.c(Math.cos(x), Math.sin(x))

      const z1 = complex.div(complex.real(1), z)
      const z2 = complex.div(z1, z)

      for (let fi = 0; fi < 3; fi++) {
        let coeffs = filters[fi]!

        let denominator = complex.c(coeffs[0], 0)
        denominator = complex.add(
          denominator,
          complex.mul(z1, complex.real(coeffs[1]))
        )
        denominator = complex.add(
          denominator,
          complex.mul(z2, complex.real(coeffs[2]))
        )
        let numerator = complex.real(coeffs[3])
        numerator = complex.add(
          numerator,
          complex.mul(z1, complex.real(coeffs[4]))
        )
        numerator = complex.add(
          numerator,
          complex.mul(z2, complex.real(coeffs[5]))
        )

        const res = complex.polar(complex.div(numerator, denominator))
        freqResponses[fi]![i] = res.r
      }
    }

    const freqResponse: number[] = []
    for (let i = 0; i < CANVAS_WIDTH; i++) {
      freqResponse[i] = 1.0
      for (let fi = 0; fi < 3; fi++) {
        freqResponse[i] *= freqResponses[fi]![i]!
      }

      freqResponse[i] = Math.log(freqResponse[i]!) * 0.1 + 0.5
    }

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    context.beginPath()
    context.moveTo(0, CANVAS_HEIGHT - CANVAS_HEIGHT * freqResponse[0]!)
    for (let i = 1; i < CANVAS_WIDTH; i++) {
      context.lineTo(i, CANVAS_HEIGHT - CANVAS_HEIGHT * freqResponse[i]!)
    }
    context.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT)
    context.lineTo(0, CANVAS_HEIGHT)
    context.closePath()
    context.fillStyle = moduleConfig.EQ3.colors.darker
    context.fill()

    context.beginPath()
    context.moveTo(0, CANVAS_HEIGHT - CANVAS_HEIGHT * freqResponse[0]!)
    for (let i = 1; i < CANVAS_WIDTH; i++) {
      context.lineTo(i, CANVAS_HEIGHT - CANVAS_HEIGHT * freqResponse[i]!)
    }
    context.strokeStyle = moduleConfig.EQ3.colors.lighter
    context.lineWidth = 2
    context.stroke()

    context.fillStyle = '#ffffff7f'
    context.fillRect(0, CANVAS_HEIGHT * 0.5 - 1, CANVAS_WIDTH, 2)

    context.fillStyle = '#ffffff40'
    const lsFreq = voltageToFreq(getKnobValue<EQ3, 'lowshelfFreq'>(id, 0) ?? 0)
    const hsFreq = voltageToFreq(getKnobValue<EQ3, 'highshelfFreq'>(id, 3) ?? 0)
    const pkFreq = voltageToFreq(getKnobValue<EQ3, 'peakingFreq'>(id, 6) ?? 0)
    context.fillRect(
      Math.sqrt(hsFreq / 22050) * CANVAS_WIDTH,
      0,
      1,
      CANVAS_HEIGHT
    )
    context.fillRect(
      Math.sqrt(lsFreq / 22050) * CANVAS_WIDTH,
      0,
      1,
      CANVAS_HEIGHT
    )
    context.fillRect(
      Math.sqrt(pkFreq / 22050) * CANVAS_WIDTH,
      0,
      1,
      CANVAS_HEIGHT
    )
  })

  return (
    <Module id={id} type="EQ3">
      <div class={styles.eq3}>
        <div class={styles.canvas}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
          ></canvas>
        </div>
        <div class={styles.knobs}>
          <div class={styles.knobGroup}>
            <div class={styles.label}>LOW</div>
            <Knob<EQ3, 'lowshelfFreq'>
              moduleId={id}
              param={0}
              label="FREQ"
              type="linear"
              min={-5}
              max={5.5}
              initial={-4}
              hideLabel
            />
            <Knob<EQ3, 'lowshelfSlope'>
              moduleId={id}
              param={1}
              label="SLOPE"
              type="linear"
              min={0.5}
              max={2}
              initial={0.5}
              hideLabel
            />
            <Knob<EQ3, 'lowshelfGain'>
              moduleId={id}
              param={2}
              label="GAIN"
              type="linear"
              min={-20}
              max={20}
              initial={0}
              hideLabel
            />
          </div>
          <div class={styles.separator} />
          <div class={styles.knobGroup}>
            <div class={styles.label}>MID</div>
            <Knob<EQ3, 'peakingFreq'>
              moduleId={id}
              param={6}
              label="FREQ"
              type="linear"
              min={-5}
              max={5.5}
              initial={0}
              hideLabel
            />
            <Knob<EQ3, 'peakingSlope'>
              moduleId={id}
              param={7}
              label="SLOPE"
              type="linear"
              min={0}
              max={1.92}
              initial={0.5}
              hideLabel
            />
            <Knob<EQ3, 'peakingGain'>
              moduleId={id}
              param={8}
              label="GAIN"
              type="linear"
              min={-20}
              max={17}
              initial={0}
              hideLabel
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
              min={-5}
              max={5.5}
              initial={4}
              hideLabel
            />
            <Knob<EQ3, 'highshelfSlope'>
              moduleId={id}
              param={4}
              label="SLOPE"
              type="linear"
              min={0.5}
              max={2}
              initial={0.5}
              hideLabel
            />
            <Knob<EQ3, 'highshelfGain'>
              moduleId={id}
              param={5}
              label="GAIN"
              type="linear"
              min={-20}
              max={20}
              initial={0}
              hideLabel
            />
          </div>
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
