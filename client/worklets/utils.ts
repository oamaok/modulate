export const getAliasedOutput = (outputs: Float32Array[]): Float32Array => {
  const output = outputs[0]
  for (let i = 1; i < outputs.length; i++) {
    outputs[i] = output
  }
  return output
}

export const lerp = (a: number, b: number, t: number) => a + t * (b - a)

export const resample = (
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

const MAX_LENGTH = 32 * sampleRate

let swapBuffer = new Float32Array(MAX_LENGTH)

export class FeedbackCombFilter {
  buffer = new Float32Array(MAX_LENGTH)
  length: number
  t = 0
  gain: number

  constructor(delay: number, gain: number) {
    this.length = ~~(delay * sampleRate)
    this.gain = gain
    if (this.length > MAX_LENGTH) {
      throw new Error('length > MAX_LENGTH')
    }
  }

  setDelay(delay: number) {
    const length = Math.max(1, ~~(delay * sampleRate))
    if (length > MAX_LENGTH) {
      throw new Error('length > MAX_LENGTH')
    }

    if (length === this.length) {
      return
    }

    resample(this.buffer, swapBuffer, this.length, length)

    const tmp = this.buffer
    this.buffer = swapBuffer
    swapBuffer = tmp

    this.t = ~~((this.t / this.length) * length)
    this.length = length
  }

  step(sample: number): number {
    let { buffer, gain, t } = this

    buffer[t] = sample + buffer[t] * gain
    t++
    if (t > this.length) {
      t = 0
    }
    this.t = t

    return buffer[t]
  }
}

export class AllPassFilter {
  fBuffer = new Float32Array(sampleRate)
  iBuffer = new Float32Array(sampleRate)
  length: number
  t = 0
  gain: number

  constructor(delay: number, gain: number) {
    this.length = ~~(delay * sampleRate)
    this.gain = gain
    if (this.length > sampleRate) {
      throw new Error('length > sampleRate')
    }
  }

  /*

  setDelay(delay: number) {
    const length = delay * sampleRate
    if (length > MAX_LENGTH) {
      throw new Error('length > MAX_LENGTH')
    }

    resample(
      this.buffer,
      swapBuffer,
      this.length,
      length)
      
      const tmp = this.buffer
      this.buffer = swapBuffer
      swapBuffer = tmp

      this.t = ~~(this.t / this.length) * length
    this.length = length

  }*/

  step(sample: number): number {
    let { fBuffer, iBuffer, gain, t } = this

    fBuffer[t] = -gain * sample + iBuffer[t] + gain * fBuffer[t]
    iBuffer[t] = sample

    t++
    if (t > this.length) {
      t = 0
    }
    this.t = t

    return fBuffer[t]
  }
}
