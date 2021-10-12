const getParameterValueAtSample = (parameter: Float32Array, sample: number) => {
  return parameter.length === 1 ? parameter[0] : parameter[sample]
}

class Clock extends AudioWorkletProcessor {
  static parameterDescriptors = [
    {
      name: 'tempo',
      minValue: 1,
      maxValue: 500,
      defaultValue: 128,
      automationRate: 'a-rate',
    },
    {
      name: 'pulseWidth',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
  ] as const

  t = 0

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ) {
    for (let sample = 0; sample < 128; sample++) {
      const tempo = getParameterValueAtSample(parameters.tempo, sample)
      const pulseWidth = getParameterValueAtSample(
        parameters.pulseWidth,
        sample
      )

      const samplesPerCycle = sampleRate * (60 / tempo)

      const value = this.t < samplesPerCycle * pulseWidth ? 1 : 0
      this.t = (this.t + 1) % ~~samplesPerCycle

      for (let i = 0; i < outputs.length; i++) {
        for (let j = 0; j < outputs[i].length; j++) {
          outputs[i][j][sample] = value
        }
      }
    }

    return true
  }
}

export default Clock

registerProcessor('Clock', Clock)
