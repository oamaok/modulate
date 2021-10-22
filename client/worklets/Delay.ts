import { resample, getAliasedOutput } from './utils'

const getParameterValueAtSample = (parameter: Float32Array, sample: number) => {
  return parameter.length === 1 ? parameter[0] : parameter[sample]
}

class Delay extends AudioWorkletProcessor {
  static parameterDescriptors = [
    {
      name: 'delayTime',
      minValue: 0.01,
      maxValue: 10,
      defaultValue: 0.1,
      automationRate: 'a-rate',
    },
    {
      name: 'feedBack',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.2,
      automationRate: 'a-rate',
    },
    {
      name: 'wet',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
    {
      name: 'dry',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
  ] as const

  ringBuffers: [Float32Array, Float32Array] = [
    new Float32Array(sampleRate * 11),
    new Float32Array(sampleRate * 11),
  ]
  currentBuffer = 0
  currentBufferLength = ~~(sampleRate * 0.1)

  t = 0

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ) {
    const input = inputs[0][0]
    const output = getAliasedOutput(outputs)

    let currentBuffer = this.ringBuffers[this.currentBuffer]

    const nextBufLen = ~~(
      getParameterValueAtSample(parameters.delayTime, 0) * sampleRate
    )

    if (nextBufLen !== this.currentBufferLength) {
      this.currentBuffer = this.currentBuffer ^ 1
      const otherBuffer = this.ringBuffers[this.currentBuffer]

      this.t = ~~((this.t / this.currentBufferLength) * nextBufLen)
      resample(currentBuffer, otherBuffer, this.currentBufferLength, nextBufLen)
      currentBuffer = otherBuffer
      this.currentBufferLength = nextBufLen
    }

    let t = this.t

    if (parameters.wet.length === 1 && parameters.dry.length === 1) {
      const dry = parameters.dry[0]
      const wet = parameters.wet[0]

      for (let sample = 0; sample < 128; sample++) {
        const fb = getParameterValueAtSample(parameters.feedBack, sample)
        const inputValue = input ? input[sample] : 0

        const value = inputValue * dry + currentBuffer[t] * wet
        currentBuffer[t] = currentBuffer[t] * fb + inputValue
        output[sample] = value

        t++
        if (t >= nextBufLen) {
          t = 0
        }
      }
    } else {
      for (let sample = 0; sample < 128; sample++) {
        const dry = getParameterValueAtSample(parameters.dry, sample)
        const wet = getParameterValueAtSample(parameters.wet, sample)
        const fb = getParameterValueAtSample(parameters.feedBack, sample)
        const inputValue = input ? input[sample] : 0

        const value = inputValue * dry + currentBuffer[t] * wet
        currentBuffer[t] = currentBuffer[t] * fb + inputValue
        output[sample] = value

        t++
        if (t >= nextBufLen) {
          t = 0
        }
      }
    }
    this.t = t

    return true
  }
}

export default Delay

registerProcessor('Delay', Delay)
