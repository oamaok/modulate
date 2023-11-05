use crate::{
  modulate_core::{AudioInput, AudioOutput, AudioParam, AudioParamModulationType, QUANTUM_SIZE},
  module::Module,
};

pub struct Gain {
  input: AudioInput,
  output: AudioOutput,
  gain: AudioParam,
}

impl Module for Gain {
  fn process(&mut self, quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      self.output[sample] = self.input.at(sample) * self.gain.at(sample, quantum)
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![&mut self.gain]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }
}

impl Gain {
  pub fn new() -> Gain {
    Gain {
      input: AudioInput::default(),
      output: AudioOutput::default(),
      gain: AudioParam::new(AudioParamModulationType::Additive),
    }
  }
}
