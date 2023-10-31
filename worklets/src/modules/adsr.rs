use super::super::modulate_core;
use super::super::module;

#[derive(Default)]
pub struct ADSR {
  gate_input: modulate_core::AudioInput,
  output: modulate_core::AudioOutput,

  attack_time: modulate_core::AudioParam,
  attack_tension: modulate_core::AudioParam,
  decay_time: modulate_core::AudioParam,
  decay_tension: modulate_core::AudioParam,
  sustain_level: modulate_core::AudioParam,
  release_time: modulate_core::AudioParam,
  release_tension: modulate_core::AudioParam,

  adsr: modulate_core::ADSRCurve,
}

impl module::Module for ADSR {
  fn process(&mut self, quantum: u64) {
    for sample in 0..modulate_core::QUANTUM_SIZE {
      self.adsr.attack_time = self.attack_time.at(sample, quantum);
      self.adsr.attack_tension = self.attack_tension.at(sample, quantum);
      self.adsr.decay_time = self.decay_time.at(sample, quantum);
      self.adsr.decay_tension = self.decay_tension.at(sample, quantum);
      self.adsr.sustain_level = self.sustain_level.at(sample, quantum);
      self.adsr.release_time = self.release_time.at(sample, quantum);
      self.adsr.release_tension = self.release_tension.at(sample, quantum);

      self.output[sample] = self.adsr.step(self.gate_input.at(sample));
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut modulate_core::AudioInput> {
    vec![&mut self.gate_input]
  }

  fn get_parameters(&mut self) -> Vec<&mut modulate_core::AudioParam> {
    vec![
      &mut self.attack_time,
      &mut self.decay_time,
      &mut self.sustain_level,
      &mut self.release_time,
      &mut self.attack_tension,
      &mut self.decay_tension,
      &mut self.release_tension,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut modulate_core::AudioOutput> {
    vec![&mut self.output]
  }
}

impl ADSR {
  pub fn new() -> ADSR {
    ADSR::default()
  }
}
