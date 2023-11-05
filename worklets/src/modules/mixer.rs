use crate::{
  modulate_core::{AudioInput, AudioOutput, AudioParam, QUANTUM_SIZE},
  module::Module,
};

#[derive(Default)]
pub struct Mixer {
  inputs: [AudioInput; 8],
  params: [AudioParam; 8],
  output: AudioOutput,
}

impl Module for Mixer {
  fn process(&mut self, quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      let v = self
        .inputs
        .iter()
        .enumerate()
        .map(|(ix, input)| input.at(sample) * self.params[ix].at(sample, quantum))
        .sum();
      self.output[sample] = v
    }
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    self.inputs.iter_mut().collect()
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    self.params.iter_mut().collect()
  }
}

impl Mixer {
  pub fn new() -> Mixer {
    Mixer::default()
  }
}
