import { getAliasedOutput } from './utils'

const SMOOTHING = 0.8

class Oscillator extends AudioWorkletProcessor {
  static parameterDescriptors = [
    {
      name: 'cv',
      minValue: -5,
      maxValue: 5,
      defaultValue: 0,
      automationRate: 'a-rate',
    },
    {
      name: 'fm',
      minValue: -1,
      maxValue: 1,
      defaultValue: 0,
      automationRate: 'a-rate',
    },
    {
      name: 'fine',
      minValue: -1,
      maxValue: 1,
      defaultValue: 0,
      automationRate: 'a-rate',
    },
    {
      name: 'pw',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
  ] as const

  t = 0

  sinAcc = 0
  triAcc = 0
  sawAcc = 0
  sqrAcc = 0

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ) {
    const cvInput = inputs[0][0]
    const fmInput = inputs[1][0]
    const pwInput = inputs[2][0]

    const sineOutput = getAliasedOutput(outputs[0])
    const triangleOutput = getAliasedOutput(outputs[1])
    const sawOutput = getAliasedOutput(outputs[2])
    const squareOutput = getAliasedOutput(outputs[3])

    for (let sample = 0; sample < 128; sample++) {
      const cvParam =
        parameters.cv.length === 1 ? parameters.cv[0] : parameters.cv[sample]
      const fmParam =
        parameters.fm.length === 1 ? parameters.fm[0] : parameters.fm[sample]
      const fineParam =
        parameters.fine.length === 1
          ? parameters.fine[0]
          : parameters.fine[sample]
      const pwParam =
        parameters.pw.length === 1 ? parameters.pw[0] : parameters.pw[sample]

      const cv = cvInput ? cvInput[sample] : 0
      const fm = fmInput ? fmInput[sample] : 0

      const freq =
        13.75 * 2 ** (5 + cv + cvParam + fm * fmParam + fineParam / 12)
      const t = this.t

      {
        const value = Math.sin(t * Math.PI * 2)
        this.sinAcc = this.sinAcc + SMOOTHING * (value - this.sinAcc)
        sineOutput[sample] = this.sinAcc
      }

      {
        const value = t < 0.5 ? t * 4 - 1 : -t * 4 + 3
        this.triAcc = this.triAcc + SMOOTHING * (value - this.triAcc)
        triangleOutput[sample] = value
      }

      {
        const value = t * 2 - 1
        this.sawAcc = this.sawAcc + SMOOTHING * (value - this.sawAcc)
        sawOutput[sample] = this.sawAcc
      }

      {
        const pw = pwInput ? pwInput[sample] : 0
        const value = t < pw + pwParam ? 1 : -1
        this.sqrAcc = this.sqrAcc + SMOOTHING * (value - this.sqrAcc)
        squareOutput[sample] = this.sqrAcc
      }

      this.t = (t + freq / sampleRate) % 1
    }

    return true
  }
}

export default Oscillator

registerProcessor('Oscillator', Oscillator)
