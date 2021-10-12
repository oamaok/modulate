const getParameterValueAtSample = (parameter: Float32Array, sample: number) => {
  return parameter.length === 1 ? parameter[0] : parameter[sample]
}

const lerp = (a: number, b: number, t: number) => a + t * (b - a)

class ADSR extends AudioWorkletProcessor {
  static parameterDescriptors = [
    {
      name: 'attack',
      minValue: 0,
      maxValue: 60,
      defaultValue: 0.1,
      automationRate: 'a-rate',
    },
    {
      name: 'decay',
      minValue: 0,
      maxValue: 60,
      defaultValue: 0.1,
      automationRate: 'a-rate',
    },
    {
      name: 'sustain',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
    {
      name: 'release',
      minValue: 0,
      maxValue: 60,
      defaultValue: 0.1,
      automationRate: 'a-rate',
    },
  ] as const

  t = 0
  level = 0
  releaseLevel = 0
  isHeld = false

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ) {
    const inputChannels = inputs[0]
    const outputChannels = outputs[0]
    const inputChannel = inputChannels[0]

    if (!inputChannel) return true

    for (let sample = 0; sample < 128; sample++) {
      const isHeld = inputChannel[sample] > 0.5

      if (this.isHeld !== isHeld) {
        this.releaseLevel = this.level
        this.isHeld = isHeld
        this.t = 0
      }

      if (isHeld) {
        const attack = getParameterValueAtSample(parameters.attack, sample)
        const decay = getParameterValueAtSample(parameters.decay, sample)
        const sustain = getParameterValueAtSample(parameters.sustain, sample)

        const attackT = this.t / sampleRate / attack
        const decayT = (this.t - attack * sampleRate) / sampleRate / decay

        if (attackT < 1) {
          this.level = lerp(this.releaseLevel, 1, attackT)
        } else if (decayT < 1) {
          this.level = lerp(1, sustain, decayT)
        } else {
          this.level = sustain
        }
      } else {
        const release = getParameterValueAtSample(parameters.release, sample)
        const releaseT = this.t / sampleRate / release
        if (releaseT < 1) {
          this.level = lerp(this.releaseLevel, 0, releaseT)
        }
      }

      if (outputChannels[0]) {
        outputChannels[0][sample] = this.level
      }

      this.t++
    }

    return true
  }
}

export default ADSR

registerProcessor('ADSR', ADSR)
