const getParameterValueAtSample = (parameter: Float32Array, sample: number) => {
  return parameter.length === 1 ? parameter[0] : parameter[sample]
}

const resample = (
  src: Float32Array,
  dst: Float32Array,
  srcLen: number,
  dstLen: number
) => {
  const ratio = srcLen / dstLen
  for (let i = 0; i < dstLen; i++) {
    const srcPos = ratio * i
    const srcI = ~~srcPos
    const t = srcPos - srcI
    const a = src[srcI]
    const b = src[(srcI + 1) % srcLen]
    dst[i] = a + t * (b - a)
  }
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

  buffer0: Float32Array = new Float32Array(sampleRate * 11)
  buffer1: Float32Array = new Float32Array(sampleRate * 11)
  currentBuffer = 0
  currentBufferLength = ~~(sampleRate * 0.1)

  t = 0

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ) {
    const input = inputs[0][0]
    const output = outputs[0][0]

    let currentBuffer = this.currentBuffer ? this.buffer1 : this.buffer0

    const nextBufLen = ~~(
      getParameterValueAtSample(parameters.delayTime, 0) * sampleRate
    )

    if (nextBufLen !== this.currentBufferLength) {
      const otherBuffer = this.currentBuffer ? this.buffer0 : this.buffer1
      this.currentBuffer = this.currentBuffer ^ 1

      this.t = ~~((this.t / this.currentBufferLength) * nextBufLen)
      resample(currentBuffer, otherBuffer, this.currentBufferLength, nextBufLen)
      currentBuffer = otherBuffer
      this.currentBufferLength = nextBufLen
    }

    for (let sample = 0; sample < 128; sample++) {
      const inputValue = input ? input[sample] : 0

      output[sample] =
        inputValue * getParameterValueAtSample(parameters.dry, sample) +
        currentBuffer[this.t] *
          getParameterValueAtSample(parameters.wet, sample)

      currentBuffer[this.t] =
        (currentBuffer[this.t] + inputValue) *
        getParameterValueAtSample(parameters.feedBack, sample)
      this.t = (this.t + 1) % this.currentBufferLength
    }

    return true
  }
}

export default Delay

registerProcessor('Delay', Delay)
