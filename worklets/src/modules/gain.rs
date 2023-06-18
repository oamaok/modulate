use super::super::modulate_core;
use super::super::module;

pub struct Gain {
  input: modulate_core::AudioInput,
  output: modulate_core::AudioOutput,
  gain: modulate_core::AudioParam,
}

impl module::Module for Gain {
  fn process(&mut self) {
    for sample in 0..modulate_core::QUANTUM_SIZE {
      self.output[sample] = self.input.at(sample) * self.gain.at(sample)
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut modulate_core::AudioInput> {
    vec![&mut self.input]
  }

  fn get_parameters(&mut self) -> Vec<&mut modulate_core::AudioParam> {
    vec![&mut self.gain]
  }

  fn get_outputs(&mut self) -> Vec<&mut modulate_core::AudioOutput> {
    vec![&mut self.output]
  }
}

impl Gain {
  pub fn new() -> Gain {
    Gain {
      input: modulate_core::AudioInput::default(),
      output: modulate_core::AudioOutput::default(),
      gain: modulate_core::AudioParam::new(modulate_core::AudioParamModulationType::Additive),
    }
  }
}
