import { ClockMessage, SequencerMessage } from '../../common/types'
import {
  Oscillator,
  Mixer,
  Sequencer,
  ADSR,
  Reverb,
  Delay,
  Clock,
  Gain,
  Limiter,
  BiquadFilter,
  PowShaper,
  MIDI,
} from '../pkg/worklets'

export type Module<
  T extends {
    inputs: () => Int32Array
    outputs: () => Int32Array
    parameters: () => Int32Array
    process: () => void
  }
> = {
  name: string
  constructor: { new (): T }
  parameterDescriptors?: AudioParamDescriptor[]
  init: (instance: T, port: MessagePort) => void
  onMessage?: (instance: T, message: any) => void
}

const OscillatorDef = {
  name: 'Oscillator',
  constructor: Oscillator,
  parameterDescriptors: [
    {
      name: 'cv',
      minValue: -5,
      maxValue: 5,
      defaultValue: 0,
      automationRate: 'a-rate',
    },
    {
      name: 'fm',
      minValue: -1,
      maxValue: 1,
      defaultValue: 0,
      automationRate: 'a-rate',
    },
    {
      name: 'pw',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
    {
      name: 'fine',
      minValue: -1,
      maxValue: 1,
      defaultValue: 0,
    },
  ],
} as const

const MixerDef = {
  name: 'Mixer',
  constructor: Mixer,
  parameterDescriptors: [
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
  ],
} as const

const SequencerDef = {
  name: 'Sequencer',
  constructor: Sequencer,
  parameterDescriptors: [
    {
      name: 'sequenceLength',
      minValue: 1,
      maxValue: 32,
      defaultValue: 0,
      automationRate: 'a-rate',
    },
    {
      name: 'glide',
      minValue: 0,
      maxValue: 4,
      defaultValue: 0,
      automationRate: 'a-rate',
    },
  ],
  init(instance: Sequencer, port: MessagePort) {
    instance.on_advance((step: number) => {
      port.postMessage({
        type: 'CURRENT_STEP',
        step,
      })
    })
  },
  onMessage(instance: Sequencer, msg: SequencerMessage) {
    switch (msg.type) {
      case 'SET_NOTES': {
        instance.set_notes(msg.notes)
        break
      }
    }
  },
} as const

const ReverbDef = {
  name: 'Reverb',
  constructor: Reverb,
  parameterDescriptors: [
    {
      name: 'delay',
      minValue: 0,
      maxValue: 10,
      defaultValue: 0.3,
      automationRate: 'a-rate',
    },
    {
      name: 'decay',
      minValue: 0,
      maxValue: 0.99,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
    {
      name: 'diffuse',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
    {
      name: 'wet',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.25,
      automationRate: 'a-rate',
    },
    {
      name: 'dry',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
  ],
} as const

const DelayDef = {
  name: 'Delay',
  constructor: Delay,
  parameterDescriptors: [
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
  ],
} as const

const ADSRDef = {
  name: 'ADSR',
  constructor: ADSR,
  parameterDescriptors: [
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
  ],
} as const

const ClockDef = {
  name: 'Clock',
  constructor: Clock,
  onMessage(instance: Clock, msg: ClockMessage) {
    switch (msg.type) {
      case 'RESET': {
        instance.reset()
        break
      }

      case 'SET_RUNNING': {
        instance.set_running(msg.isRunning)
        break
      }
    }
  },
  parameterDescriptors: [
    {
      name: 'tempo',
      minValue: 1,
      maxValue: 512,
      defaultValue: 128,
      automationRate: 'a-rate',
    },
    {
      name: 'ratio1',
      minValue: 0.1,
      maxValue: 32,
      defaultValue: 1,
      automationRate: 'a-rate',
    },
    {
      name: 'ratio2',
      minValue: 0.1,
      maxValue: 32,
      defaultValue: 2,
      automationRate: 'a-rate',
    },
    {
      name: 'ratio3',
      minValue: 0.1,
      maxValue: 32,
      defaultValue: 4,
      automationRate: 'a-rate',
    },
    {
      name: 'pulseWidth1',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
    {
      name: 'pulseWidth2',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
    {
      name: 'pulseWidth3',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
    {
      name: 'swing1',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
    {
      name: 'swing2',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
    {
      name: 'swing3',
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
  ],
} as const

const GainDef = {
  name: 'Gain',
  constructor: Gain,
  parameterDescriptors: [
    {
      name: 'gain',
      minValue: 0,
      maxValue: 2,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
  ],
} as const

const LimiterDef = {
  name: 'Limiter',
  constructor: Limiter,
  parameterDescriptors: [
    {
      name: 'threshold',
      minValue: 0,
      maxValue: 2,
      defaultValue: 0.5,
      automationRate: 'a-rate',
    },
  ],
} as const

const FilterDef = {
  name: 'Filter',
  constructor: BiquadFilter,
  parameterDescriptors: [
    {
      name: 'frequency',
      minValue: -5,
      maxValue: 5,
      defaultValue: 0,
      automationRate: 'a-rate',
    },
    {
      name: 'Q',
      minValue: 0,
      maxValue: 10,
      defaultValue: 0,
      automationRate: 'a-rate',
    },
  ],
} as const

const PowShaperDef = {
  name: 'PowShaper',
  constructor: PowShaper,
  parameterDescriptors: [
    {
      name: 'exponent',
      minValue: 0.01,
      maxValue: 4,
      defaultValue: 2,
      automationRate: 'a-rate',
    },
    {
      name: 'gain',
      minValue: 0,
      maxValue: 2,
      defaultValue: 1,
      automationRate: 'a-rate',
    },
    {
      name: 'preGain',
      minValue: 0,
      maxValue: 2,
      defaultValue: 1,
      automationRate: 'a-rate',
    },
  ],
} as const

const MIDIDef = {
  name: 'MIDI',
  constructor: MIDI,
  onMessage(instance: MIDI, msg: number) {
    instance.on_message(msg)
  },
  parameterDescriptors: [],
} as const

export const modules = [
  OscillatorDef,
  MixerDef,
  SequencerDef,
  ReverbDef,
  DelayDef,
  ADSRDef,
  ClockDef,
  GainDef,
  LimiterDef,
  FilterDef,
  PowShaperDef,
  MIDIDef,
] as const

export type Modules = typeof modules extends { [k: number]: infer Mod }
  ? Mod
  : never
