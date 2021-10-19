const getParameterValueAtSample = (parameter: Float32Array, sample: number) => {
  return parameter.length === 1 ? parameter[0] : parameter[sample]
}

const lerp = (a: number, b: number, t: number) => a + t * (b - a)

class Mixer extends AudioWorkletProcessor {
  static parameterDescriptors = [
    {
      name: 'mainLevel',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.8,
      automationRate: 'a-rate',
    },
    {
      name: 'busLevel0',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.8,
      automationRate: 'a-rate',
    },
    {
      name: 'busLevel1',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.8,
      automationRate: 'a-rate',
    },
    {
      name: 'busLevel2',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.8,
      automationRate: 'a-rate',
    },
    {
      name: 'busLevel3',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.8,
      automationRate: 'a-rate',
    },
    {
      name: 'busLevel4',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.8,
      automationRate: 'a-rate',
    },
    {
      name: 'busLevel5',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.8,
      automationRate: 'a-rate',
    },
    {
      name: 'busLevel6',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.8,
      automationRate: 'a-rate',
    },
    {
      name: 'busLevel7',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.8,
      automationRate: 'a-rate',
    },
  ] as const

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ) {
    for (let sample = 0; sample < 128; sample++) {
      let value = 0

      for (let i = 0; i < inputs.length; i++) {
        if (inputs[i][0])
          value +=
            inputs[i][0][sample] *
            getParameterValueAtSample(parameters['busLevel' + i], sample)
      }

      outputs[0][0][sample] =
        value * getParameterValueAtSample(parameters.mainLevel, sample)
    }

    return true
  }
}

export default Mixer

registerProcessor('Mixer', Mixer)
