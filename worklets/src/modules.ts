import { Note, Vec2 } from '@modulate/common/types'

export type AudioOut = {
  name: 'AudioOut'
  inputs: ['input']
  parameters: ['volume']
  outputs: []
}

export type Oscillator = {
  name: 'Oscillator'
  inputs: ['sync']
  parameters: ['cv', 'fm', 'pw', 'fine']
  outputs: ['sin', 'tri', 'saw', 'sqr']
}

export type BiquadFilter = {
  name: 'BiquadFilter'
  inputs: ['input']
  parameters: ['frequency', 'resonance']
  outputs: ['lowpass', 'highpass']
}

export type Mixer = {
  name: 'Mixer'
  inputs: [
    'input0',
    'input1',
    'input2',
    'input3',
    'input4',
    'input5',
    'input6',
    'input7'
  ]
  parameters: [
    'level0',
    'level1',
    'level2',
    'level3',
    'level4',
    'level5',
    'level6',
    'level7'
  ]
  outputs: ['output']
}

export type Gain = {
  name: 'Gain'
  inputs: ['input']
  parameters: ['gain']
  outputs: ['output']
}

export type Limiter = {
  name: 'Limiter'
  inputs: ['input']
  parameters: ['threshold']
  outputs: ['output']
}

export type PowShaper = {
  name: 'PowShaper'
  inputs: ['input']
  parameters: ['exponent', 'gain', 'preGain']
  outputs: ['output']
}

export type Sequencer = {
  name: 'Sequencer'
  inputs: ['gate']
  parameters: ['length', 'glide']
  outputs: ['cv', 'gate']
  // Set sequencer notes
  messages: { type: 'SequencerSetNotes'; notes: Note[] }

  // Sequencer advance
  events: { type: 'SequencerAdvance'; position: number }
}

export type ADSR = {
  name: 'ADSR'
  inputs: ['gate']
  parameters: ['attack', 'decay', 'sustain', 'release']
  outputs: ['envelope']
}

export type Delay = {
  name: 'Delay'
  inputs: ['input']
  parameters: ['time', 'feedback', 'wet', 'dry']
  outputs: ['output']
}

export type Reverb = {
  name: 'Reverb'
  inputs: ['input']
  parameters: ['delay', 'decay', 'diffuse', 'wet', 'dry']
  outputs: ['output']
}

export type Clock = {
  name: 'Clock'
  inputs: []
  parameters: [
    'tempo',
    'ratio0',
    'ratio1',
    'ratio2',
    'pw0',
    'pw1',
    'pw2',
    'swing0',
    'swing1',
    'swing2'
  ]
  outputs: ['pulse0', 'pulse1', 'pulse2']

  messages:
    | { type: 'ClockReset' }
    | { type: 'ClockSetRunning'; running: boolean }
}

export type MIDI = {
  name: 'MIDI'
  inputs: []
  parameters: []
  outputs: ['cv', 'velocity', 'gate']
  messages: { type: 'MidiMessage'; message: number }
}

export type BouncyBoi = {
  name: 'BouncyBoi'
  inputs: []
  parameters: ['speed', 'gravity']
  outputs: ['trig0', 'trig1', 'trig2', 'vel0', 'vel1', 'vel2']

  events: {
    type: 'BouncyBoiUpdate'
    balls: { pos: Vec2; vel: Vec2 }[]
    phase: number
  }
}

export type Module =
  | AudioOut
  | Oscillator
  | BiquadFilter
  | Mixer
  | Gain
  | Limiter
  | PowShaper
  | Sequencer
  | ADSR
  | Delay
  | Reverb
  | Clock
  | MIDI
  | BouncyBoi

export type ModuleName = Module['name']

export type EventTypes<
  M extends Extract<Module, { events: any }>,
  T extends M['events']['type']
> = Extract<M['events'], { type: T }>
