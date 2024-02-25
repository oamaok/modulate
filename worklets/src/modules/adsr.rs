use crate::audio_input::AudioInput;
use crate::audio_output::AudioOutput;
use crate::audio_param::AudioParam;
use crate::{adsr_curve::ADSRCurve, modulate_core::QUANTUM_SIZE, module::Module};

#[derive(Default)]
pub struct ADSR {
  gate_input: AudioInput,
  output: AudioOutput,

  attack_time: AudioParam,
  attack_tension: AudioParam,
  decay_time: AudioParam,
  decay_tension: AudioParam,
  sustain_level: AudioParam,
  release_time: AudioParam,
  release_tension: AudioParam,
  amount: AudioParam,

  adsr: ADSRCurve,
}

impl Module for ADSR {
  fn process(&mut self, _quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      self.adsr.attack_time = self.attack_time.at(sample);
      self.adsr.attack_tension = self.attack_tension.at(sample);
      self.adsr.decay_time = self.decay_time.at(sample);
      self.adsr.decay_tension = self.decay_tension.at(sample);
      self.adsr.sustain_level = self.sustain_level.at(sample);
      self.adsr.release_time = self.release_time.at(sample);
      self.adsr.release_tension = self.release_tension.at(sample);

      self.output[sample] = self.adsr.step(self.gate_input.at(sample)) * self.amount.at(sample);
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.gate_input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.attack_time,
      &mut self.decay_time,
      &mut self.sustain_level,
      &mut self.release_time,
      &mut self.attack_tension,
      &mut self.decay_tension,
      &mut self.release_tension,
      &mut self.amount,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }
}

impl ADSR {
  pub fn new() -> Box<ADSR> {
    Box::new(ADSR::default())
  }
}
