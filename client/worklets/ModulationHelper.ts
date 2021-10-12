const cvToFreq = (voltage: number) => {
  return 13.75 * 2 ** voltage
}

class ModulationHelper extends AudioWorkletProcessor {
  static parameterDescriptors = [
    {
      name: 'level',
      minValue: -10,
      maxValue: 10,
      defaultValue: 1,
      automationRate: 'a-rate',
    },
  ] as const

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ) {
    for (let sample = 0; sample < 128; sample++) {
      let cv =
        parameters.level.length === 1
          ? parameters.level[0]
          : parameters.level[sample]

      const input = inputs[0]

      if (input) {
        for (let ch = 0; ch < input.length; ch++) {
          cv += input[ch][sample]
        }
      }

      const freq = cvToFreq(cv)
      const output = outputs[0]

      if (output) {
        for (let ch = 0; ch < output.length; ch++) {
          output[ch][sample] = freq
        }
      }
    }

    return true
  }
}

export default ModulationHelper

registerProcessor('ModulationHelper', ModulationHelper)
