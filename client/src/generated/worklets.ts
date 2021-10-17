// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// THIS IS A GENERATED FILE, DO NOT EDIT MANUALLY
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
import ADSR from '../../worklets/ADSR'
import Clock from '../../worklets/Clock'
import Gain from '../../worklets/Gain'
import ModulationHelper from '../../worklets/ModulationHelper'
import Sequencer from '../../worklets/Sequencer'
export const workletNames = [
  'ADSR',
  'Clock',
  'Gain',
  'ModulationHelper',
  'Sequencer',
] as const
export type Worklets = {
  ADSR: typeof ADSR
  Clock: typeof Clock
  Gain: typeof Gain
  ModulationHelper: typeof ModulationHelper
  Sequencer: typeof Sequencer
}
