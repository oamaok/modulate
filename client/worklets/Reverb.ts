import { AllPassFilter, FeedbackCombFilter, getAliasedOutput } from './utils'

const COMB_GAIN_OFFSETS = [0, -0.01313, -0.02743, -0.031]
const COMB_DELAY_OFFSETS = [0, -0.011, +0.019, -0.008]

class Reverb extends AudioWorkletProcessor {
  static parameterDescriptors = [
    {
      name: 'delay',
      minValue: 0,
      maxValue: 10,
      defaultValue: 0.3,
      automationRate: 'a-rate',
    },
    {
      name: 'decay',
      minValue: 0,
      maxValue: 0.99,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
    {
      name: 'diffuse',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
    {
      name: 'wet',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.7,
      automationRate: 'a-rate',
    },
    {
      name: 'dry',
      minValue: 0,
      maxValue: 1,
      defaultValue: 1,
      automationRate: 'a-rate',
    },
  ] as const

  combFilters = [
    new FeedbackCombFilter(0.01, 0.1),
    new FeedbackCombFilter(0.01, 0.1),
    new FeedbackCombFilter(0.01, 0.1),
    new FeedbackCombFilter(0.01, 0.1),
  ]

  allPassFilters = [
    new AllPassFilter(1051 / sampleRate, 0.7),
    new AllPassFilter(337 / sampleRate, 0.7),
    new AllPassFilter(113 / sampleRate, 0.7),
  ]

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ) {
    const delay = parameters.delay[0]
    const decay = parameters.decay[0]
    const diffuse = parameters.diffuse[0]
    const wet = parameters.wet[0]
    const dry = parameters.dry[0]
    const output = getAliasedOutput(outputs[0])

    const input = inputs[0][0]

    for (let i = 0; i < this.combFilters.length; i++) {
      this.combFilters[i].setDelay(delay + COMB_DELAY_OFFSETS[i])
    }

    for (let sample = 0; sample < 128; sample++) {
      const inputSample = input ? input[sample] : 0
      let outputValue = 0

      for (let i = 0; i < this.combFilters.length; i++) {
        const filter = this.combFilters[i]
        filter.gain = decay + COMB_GAIN_OFFSETS[i]
        outputValue += filter.step(inputSample)
      }

      for (const filter of this.allPassFilters) {
        filter.gain = diffuse
        outputValue = filter.step(-outputValue)
      }

      output[sample] = outputValue * wet + inputSample * dry
    }

    return true
  }
}

export default Reverb

registerProcessor('Reverb', Reverb)
