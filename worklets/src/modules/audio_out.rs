use crate::{
  modulate_core::{AudioInput, AudioOutput, AudioParam, AudioParamModulationType, QUANTUM_SIZE},
  module::Module,
};

pub struct AudioOut {
  input: AudioInput,
  volume: AudioParam,
  output: AudioOutput,
}

impl Module for AudioOut {
  fn process(&mut self, _quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      self.output[sample] = self.input.at(sample) * self.volume.at(sample)
    }
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![&mut self.volume]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }
}

impl AudioOut {
  pub fn new() -> AudioOut {
    AudioOut {
      input: AudioInput::default(),
      volume: AudioParam::new(AudioParamModulationType::Additive),
      output: AudioOutput::default(),
    }
  }
}
