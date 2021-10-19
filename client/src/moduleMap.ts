import Oscillator from './components/modules/Oscillator'
import AudioOut from './components/modules/AudioOut'
import Gain from './components/modules/Gain'
import Clock from './components/modules/Clock'
import ADSR from './components/modules/ADSR'
import BiquadFilter from './components/modules/Filter'
import Sequencer from './components/modules/Sequencer'
import Mixer from './components/modules/Mixer'
import Delay from './components/modules/Delay'

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
} as const
