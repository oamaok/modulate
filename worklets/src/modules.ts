import { Note, Vec2 } from '@modulate/common/types'

type ModuleTypeOf<Module, Messages = never, Events = never> = Module & {
  events: Events
  messages: Messages
}

export const AudioOut = {
  name: 'AudioOut',
  inputs: ['input'],
  parameters: ['volume'],
  outputs: [],
} as const
export type AudioOut = ModuleTypeOf<typeof AudioOut>

export const Oscillator = {
  name: 'Oscillator',
  inputs: ['sync'],
  parameters: ['cv', 'fm', 'pw', 'fine', 'level'],
  outputs: ['sin', 'tri', 'saw', 'sqr'],
} as const
export type Oscillator = ModuleTypeOf<typeof Oscillator>

export const LFO = {
  name: 'LFO',
  inputs: ['sync'],
  parameters: ['cv', 'pw', 'amount'],
  outputs: ['sin', 'tri', 'saw', 'sqr'],
} as const
export type LFO = ModuleTypeOf<typeof LFO>

export const BiquadFilter = {
  name: 'BiquadFilter',
  inputs: ['input'],
  parameters: [
    'frequency',
    'resonance',
    'lowpassLevel',
    'highpassLevel',
    'freqModAmount',
    'resoModAmount',
  ],
  outputs: ['lowpass', 'highpass'],
} as const
export type BiquadFilter = ModuleTypeOf<typeof BiquadFilter>

export const Mixer = {
  name: 'Mixer',
  inputs: [
    'input0',
    'input1',
    'input2',
    'input3',
    'input4',
    'input5',
    'input6',
    'input7',
  ],
  parameters: [
    'level0',
    'level1',
    'level2',
    'level3',
    'level4',
    'level5',
    'level6',
    'level7',
  ],
  outputs: ['output'],
} as const
export type Mixer = ModuleTypeOf<typeof Mixer>

export const Gain = {
  name: 'Gain',
  inputs: ['input'],
  parameters: ['gain'],
  outputs: ['output'],
} as const
export type Gain = ModuleTypeOf<typeof Gain>

export const Limiter = {
  name: 'Limiter',
  inputs: ['input'],
  parameters: ['threshold'],
  outputs: ['output'],
} as const
export type Limiter = ModuleTypeOf<typeof Limiter>

export const PowShaper = {
  name: 'PowShaper',
  inputs: ['input'],
  parameters: ['exponent', 'gain', 'preGain'],
  outputs: ['output'],
} as const
export type PowShaper = ModuleTypeOf<typeof PowShaper>

export const Sequencer = {
  name: 'Sequencer',
  inputs: ['gate'],
  parameters: ['length', 'glide'],
  outputs: ['cv', 'gate'],
} as const
export type Sequencer = ModuleTypeOf<
  typeof Sequencer,
  { type: 'SequencerSetNotes'; notes: Note[] },
  { type: 'SequencerAdvance'; position: number }
>

export const ADSR = {
  name: 'ADSR',
  inputs: ['gate'],
  parameters: [
    'attack',
    'decay',
    'sustain',
    'release',
    'attackTension',
    'decayTension',
    'releaseTension',
    'amount',
  ],
  outputs: ['envelope'],
} as const
export type ADSR = ModuleTypeOf<typeof ADSR>

export const Delay = {
  name: 'Delay',
  inputs: ['input'],
  parameters: ['time', 'feedback', 'wet', 'dry'],
  outputs: ['output'],
} as const
export type Delay = ModuleTypeOf<typeof Delay>

export const Reverb = {
  name: 'Reverb',
  inputs: ['input'],
  parameters: ['delay', 'decay', 'diffuse', 'wet', 'dry'],
  outputs: ['output'],
} as const
export type Reverb = ModuleTypeOf<typeof Reverb>

export const Clock = {
  name: 'Clock',
  inputs: [],
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
    'swing2',
  ],
  outputs: ['pulse0', 'pulse1', 'pulse2'],
} as const

export type Clock = ModuleTypeOf<
  typeof Clock,
  { type: 'ClockReset' } | { type: 'ClockSetRunning'; running: boolean }
>

export const MIDI = {
  name: 'MIDI',
  inputs: [],
  parameters: [],
  outputs: ['cv', 'velocity', 'gate'],
} as const
export type MIDI = ModuleTypeOf<
  typeof MIDI,
  { type: 'MidiMessage'; message: number }
>

export const BouncyBoi = {
  name: 'BouncyBoi',
  inputs: [],
  parameters: ['speed', 'gravity'],
  outputs: ['trig0', 'trig1', 'trig2', 'vel0', 'vel1', 'vel2'],
} as const
export type BouncyBoi = ModuleTypeOf<
  typeof BouncyBoi,
  never,
  {
    type: 'BouncyBoiUpdate'
    balls: { pos: Vec2; vel: Vec2 }[]
    phase: number
  }
>

export const Sampler = {
  name: 'Sampler',
  inputs: ['gate'],
  parameters: ['speed', 'start', 'length', 'level'],
  outputs: ['out'],
} as const
export type Sampler = ModuleTypeOf<
  typeof Sampler,
  { type: 'SamplerAllocate'; size: number },
  | { type: 'SamplerAllocateSuccess'; ptr: number }
  | { type: 'SamplerPlayheadPtr'; ptr: number }
>

export const VirtualController = {
  name: 'VirtualController',
  inputs: [],
  parameters: ['knobA', 'knobB', 'knobC', 'knobD'],
  outputs: [
    'keyboardFirstCv',
    'keyboardFirstGate',
    'keyboardSecondCv',
    'keyboardSecondGate',
    'padA',
    'padB',
    'padC',
    'padD',
    'knobA',
    'knobB',
    'knobC',
    'knobD',
  ],
} as const

export type VirtualController = ModuleTypeOf<
  typeof VirtualController,
  never,
  { type: 'VirtualControllerPointers'; pressed_keys: number; pads: number }
>

export const PianoRoll = {
  name: 'PianoRoll',
  inputs: ['externalClock'],
  parameters: ['length', 'speed'],
  outputs: ['cv', 'gate'],
} as const
export type PianoRoll = ModuleTypeOf<
  typeof PianoRoll,
  {
    type: 'PianoRollSetNotes'
    notes: { pitch: number; start: number; length: number }[]
  },
  { type: 'PianoRollPointers'; position: number }
>

export const Oscilloscope = {
  name: 'Oscilloscope',
  inputs: ['x', 'y'],
  parameters: [],
  outputs: [],
} as const
export type Oscilloscope = ModuleTypeOf<
  typeof Oscilloscope,
  never,
  { type: 'OscilloscopePointers'; x_ptr: number; y_ptr: number }
>

export const FDNReverb = {
  name: 'FDNReverb',
  inputs: ['input'],
  parameters: ['dryWet', 'modAmount', 'modSpeed', 'decay'],
  outputs: ['output'],
} as const
export type FDNReverb = ModuleTypeOf<typeof FDNReverb>

export const modules = {
  AudioOut,
  Oscillator,
  BiquadFilter,
  Mixer,
  Gain,
  Limiter,
  PowShaper,
  Sequencer,
  ADSR,
  Delay,
  Reverb,
  Clock,
  MIDI,
  BouncyBoi,
  LFO,
  Sampler,
  VirtualController,
  PianoRoll,
  Oscilloscope,
  FDNReverb,
} as const

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
  | LFO
  | Sampler
  | VirtualController
  | PianoRoll
  | Oscilloscope
  | FDNReverb

export type ModuleName = Module['name']

export type EventTypes<
  M extends Extract<Module, { events: any }>,
  T extends M['events']['type'],
> = Extract<M['events'], { type: T }>
