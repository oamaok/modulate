// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// THIS IS A GENERATED FILE, DO NOT EDIT MANUALLY
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
import ADSR from '../../worklets/ADSR'
import Clock from '../../worklets/Clock'
import Delay from '../../worklets/Delay'
import Gain from '../../worklets/Gain'
import Mixer from '../../worklets/Mixer'
import Oscillator from '../../worklets/Oscillator'
import Sequencer from '../../worklets/Sequencer'
export const workletNames = ["ADSR","Clock","Delay","Gain","Mixer","Oscillator","Sequencer"] as const
export type Worklets = {
  ADSR: typeof ADSR
  Clock: typeof Clock
  Delay: typeof Delay
  Gain: typeof Gain
  Mixer: typeof Mixer
  Oscillator: typeof Oscillator
  Sequencer: typeof Sequencer
}
