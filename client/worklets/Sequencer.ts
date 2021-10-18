type Note = {
  gate: boolean
  voltage: number
}

const MAX_SEQUENCE_LENGTH = 32

class Sequencer extends AudioWorkletProcessor {
  sequenceLength = 16
  currentStep = 0
  tempo = 120
  sample = 0

  notes: Note[] = []

  constructor(...args: any[]) {
    super()

    this.port.onmessage = (message) => {
      this.notes = message.data
    }
  }

  previousSample = 0

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
        }
        this.previousSample = sample
      }

      if (!this.notes.length) {
        break
      }

      if (frequencyOutputChannels[0]) {
        frequencyOutputChannels[0][sampleIx] =
          this.notes[this.currentStep].voltage
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
