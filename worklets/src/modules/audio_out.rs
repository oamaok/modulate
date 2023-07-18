use super::super::modulate_core;
use super::super::module;

pub struct AudioOut {
  input: modulate_core::AudioInput,
  volume: modulate_core::AudioParam,
  output: modulate_core::AudioOutput,
}

impl module::Module for AudioOut {
  fn process(&mut self, quantum: u64) {
    for sample in 0..modulate_core::QUANTUM_SIZE {
      self.output[sample] = self.input.at(sample) * self.volume.at(sample, quantum)
    }
  }

  fn get_parameters(&mut self) -> Vec<&mut modulate_core::AudioParam> {
    vec![&mut self.volume]
  }

  fn get_outputs(&mut self) -> Vec<&mut modulate_core::AudioOutput> {
    vec![&mut self.output]
  }

  fn get_inputs(&mut self) -> Vec<&mut modulate_core::AudioInput> {
    vec![&mut self.input]
  }
}

impl AudioOut {
  pub fn new() -> AudioOut {
    AudioOut {
      input: modulate_core::AudioInput::default(),
      volume: modulate_core::AudioParam::new(modulate_core::AudioParamModulationType::Additive),
      output: modulate_core::AudioOutput::default(),
    }
  }
}
