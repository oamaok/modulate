import { SequencerMessage, Note } from '../../common/types'
import { lerp } from './utils'

const MAX_SEQUENCE_LENGTH = 32

class Sequencer extends AudioWorkletProcessor {
  static parameterDescriptors = [
    {
      name: 'glide',
      minValue: 0,
      maxValue: 4,
      defaultValue: 0,
      automationRate: 'a-rate',
    },
  ] as const

  sequenceLength = 32
  currentStep = 0
  tempo = 120
  sample = 0

  notes: Note[] = []

  constructor(...args: any[]) {
    super()

    this.port.onmessage = (msg) => {
      const message = msg.data as SequencerMessage

      switch (message.type) {
        case 'NOTES': {
          this.notes = message.notes
          break
        }

        case 'SEQUENCE_LENGTH': {
          this.sequenceLength = message.length
          break
        }
      }
    }
  }

  previousSample = 0
  previousVoltage = 0
  currentVoltage = 0
  t = 0

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ) {
    const inputChannels = inputs[0]
    const inputChannel = inputChannels[0]

    const frequencyOutputChannels = outputs[0]
    const gateOutputChannels = outputs[1]

    for (let sampleIx = 0; sampleIx < 128; sampleIx++) {
      if (inputChannel) {
        const sample = inputChannel[sampleIx]
        if (sample > 0.5 && this.previousSample < 0.5) {
          this.currentStep = (this.currentStep + 1) % this.sequenceLength
          this.previousVoltage = this.currentVoltage
          this.t = 0
        }
        this.previousSample = sample
      }

      if (!this.notes.length) {
        break
      }
      const targetVoltage = this.notes[this.currentStep].voltage

      const time = Math.max(1, sampleRate * parameters.glide[0])
      this.currentVoltage = lerp(
        this.previousVoltage,
        targetVoltage,
        Math.min(1, this.t / time)
      )
      this.t++

      if (frequencyOutputChannels[0]) {
        frequencyOutputChannels[0][sampleIx] = this.currentVoltage
      }

      if (gateOutputChannels[0]) {
        if (this.notes[this.currentStep].gate) {
          gateOutputChannels[0][sampleIx] = this.previousSample
        } else {
          gateOutputChannels[0][sampleIx] = 0
        }
      }
    }

    return true
  }
}

export default Sequencer

registerProcessor('Sequencer', Sequencer)
