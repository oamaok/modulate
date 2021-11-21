import Oscillator from './components/modules/Oscillator'
import AudioOut from './components/modules/AudioOut'
import Gain from './components/modules/Gain'
import Clock from './components/modules/Clock'
import ADSR from './components/modules/ADSR'
import BiquadFilter from './components/modules/Filter'
import Sequencer from './components/modules/Sequencer'
import Mixer from './components/modules/Mixer'
import Delay from './components/modules/Delay'
import LFO from './components/modules/LFO'
import Reverb from './components/modules/Reverb'
import MIDI from './components/modules/MIDI'
import Limiter from './components/modules/Limiter'
import PowShaper from './components/modules/PowShaper'
import Oscilloscope from './components/modules/Oscilloscope'

export const moduleMap = {
  AudioOut,
  Oscillator,
  Gain,
  Clock,
  ADSR,
  BiquadFilter,
  Sequencer,
  Mixer,
  Delay,
  LFO,
  Reverb,
  MIDI,
  Limiter,
  PowShaper,
  Oscilloscope,
} as const
