import { getAliasedOutput } from './utils'

const MIDI_NOTE_OFF = 0b1000
const MIDI_NOTE_ON = 0b1001
const MIDI_KEY_PRESSURE = 0b1010
const MIDI_CONTROL_CHANGE = 0b1011
const MIDI_PROGRAM_CHANGE = 0b1100
const MIDI_CHANNEL_PRESSURE = 0b1101
const MIDI_PITCH_BEND_CHANGE = 0b1110

class MIDI extends AudioWorkletProcessor {
  pressedNotes: Record<number, number> = {}
  outputCv: number = 0
  velocity: number = 0
  gate: number = 0

  constructor() {
    super()

    this.port.onmessage = ({ data }) => {
      const type = (data[0] & 0b11110000) >> 4
      const channel = data[0] & 0b1111

      switch (type) {
        case MIDI_NOTE_ON: {
          const note = data[1]
          const velocity = data[2]

          if (!velocity) {
            delete this.pressedNotes[note]
          } else {
            this.gate = 1
            this.pressedNotes[note] = velocity
          }

          break
        }
        case MIDI_NOTE_OFF: {
          const note = data[1]
          const velocity = data[2]
          delete this.pressedNotes[note]

          break
        }
      }
      const keys = Object.keys(this.pressedNotes)
      const note = keys[keys.length - 1]

      if (note) {
        this.outputCv = (+note - 57) / 12
        this.velocity = this.pressedNotes[+note] / 128
      } else {
        this.gate = 0
      }
    }
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ) {
    const cvOutput = getAliasedOutput(outputs[0])
    const gateOutput = getAliasedOutput(outputs[1])
    const velocityOutput = getAliasedOutput(outputs[2])

    for (let sample = 0; sample < 128; sample++) {
      cvOutput[sample] = this.outputCv
      gateOutput[sample] = this.gate
      velocityOutput[sample] = this.velocity

      this.gate -= 0.001
      if (this.gate < 0) {
        this.gate = 0
      }
    }

    return true
  }
}

export default MIDI

registerProcessor('MIDI', MIDI)
