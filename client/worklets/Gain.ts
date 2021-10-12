class Gain extends AudioWorkletProcessor {
  static parameterDescriptors = [
    {
      name: 'level',
      minValue: 0,
      maxValue: 2,
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
      let level =
        parameters.level.length === 1
          ? parameters.level[0]
          : parameters.level[sample]

      const input = inputs[0]
      const output = outputs[0]

      if (input && output) {
        for (let ch = 0; ch < input.length; ch++) {
          let value = input[ch][sample]
          output[ch][sample] = value * level
        }
      }
    }

    return true
  }
}

export default Gain

registerProcessor('Gain', Gain)
