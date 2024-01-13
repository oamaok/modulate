import { ModuleName } from '@modulate/worklets/src/modules'
import { darkenColor, lightenColor } from './colors'

const enum ModuleCategory {
  UTILITY,
  GENERATOR,
  PULSE_GENERATOR,
  SEQUENCER,
  FILTER,
  DELAY_REVERB,
  DYNAMICS,
  SAMPLER,
}

const categoryColors: { [key in ModuleCategory]: string } = {
  [ModuleCategory.UTILITY]: '#e85d00',
  [ModuleCategory.GENERATOR]: '#759b1a',
  [ModuleCategory.PULSE_GENERATOR]: '#ab3838',
  [ModuleCategory.SEQUENCER]: '#192e75',
  [ModuleCategory.FILTER]: '#5900e8',
  [ModuleCategory.DELAY_REVERB]: '#e800b6',
  [ModuleCategory.DYNAMICS]: '#438187',
  [ModuleCategory.SAMPLER]: '#cd7e2a',
}

export const categoryLabel: { [key in ModuleCategory]: string } = {
  [ModuleCategory.UTILITY]: 'Utility',
  [ModuleCategory.GENERATOR]: 'Generator',
  [ModuleCategory.PULSE_GENERATOR]: 'Pulse Generator',
  [ModuleCategory.SEQUENCER]: 'Sequencer',
  [ModuleCategory.FILTER]: 'Filter',
  [ModuleCategory.DELAY_REVERB]: 'Delay & Reverb',
  [ModuleCategory.DYNAMICS]: 'Dynamics',
  [ModuleCategory.SAMPLER]: 'Sampler',
}

export type Config = {
  [key in ModuleName]: {
    category: ModuleCategory
    colors: {
      light: string
      lighter: string
      dark: string
      darker: string
      primary: string
    }
    width: number
    height: number
  }
}

const createConfig = (config: {
  [key in ModuleName]: {
    category: ModuleCategory
    width: number
    height: number
  }
}) => {
  const ret: Config = {} as Config

  for (const key in config) {
    const moduleName = key as ModuleName
    const moduleConfig = config[moduleName]

    const primaryColor = categoryColors[moduleConfig.category]
    ret[moduleName] = {
      ...moduleConfig,
      colors: {
        primary: primaryColor,
        light: lightenColor(primaryColor, 0.35),
        lighter: lightenColor(primaryColor, 0.7),
        dark: darkenColor(primaryColor, 0.35),
        darker: darkenColor(primaryColor, 0.7),
      },
    }
  }

  return ret
}

export default createConfig({
  ADSR: {
    category: ModuleCategory.UTILITY,
    width: 280,
    height: 200,
  },
  AudioOut: {
    category: ModuleCategory.UTILITY,
    width: 100,
    height: 100,
  },
  BiquadFilter: {
    category: ModuleCategory.FILTER,
    width: 220,
    height: 130,
  },
  BouncyBoi: {
    category: ModuleCategory.PULSE_GENERATOR,
    width: 260,
    height: 240,
  },
  Clock: {
    category: ModuleCategory.PULSE_GENERATOR,
    width: 200,
    height: 260,
  },
  Delay: {
    category: ModuleCategory.DELAY_REVERB,
    width: 200,
    height: 100,
  },
  Gain: {
    category: ModuleCategory.DYNAMICS,
    width: 200,
    height: 100,
  },
  LFO: {
    category: ModuleCategory.GENERATOR,
    width: 200,
    height: 100,
  },
  Limiter: {
    category: ModuleCategory.DYNAMICS,
    width: 200,
    height: 100,
  },
  MIDI: {
    category: ModuleCategory.UTILITY,
    width: 50,
    height: 100,
  },
  Mixer: {
    category: ModuleCategory.DYNAMICS,
    width: 140,
    height: 200,
  },
  Oscillator: {
    category: ModuleCategory.GENERATOR,
    width: 260,
    height: 100,
  },
  PowShaper: {
    category: ModuleCategory.DYNAMICS,
    width: 200,
    height: 100,
  },
  Sampler: {
    category: ModuleCategory.SAMPLER,
    width: 400,
    height: 260,
  },
  Reverb: {
    category: ModuleCategory.DELAY_REVERB,
    width: 250,
    height: 120,
  },
  Sequencer: {
    category: ModuleCategory.SEQUENCER,
    width: 340,
    height: 200,
  },
  VirtualController: {
    category: ModuleCategory.UTILITY,
    width: 800,
    height: 450,
  },
  PianoRoll: {
    category: ModuleCategory.SEQUENCER,
    width: 440,
    height: 200,
  },
  Oscilloscope: {
    category: ModuleCategory.UTILITY,
    width: 450,
    height: 450,
  },
  FDNReverb: {
    category: ModuleCategory.DELAY_REVERB,
    width: 200,
    height: 200,
  },
  Chorus: {
    category: ModuleCategory.DELAY_REVERB,
    width: 400,
    height: 100,
  },
})
