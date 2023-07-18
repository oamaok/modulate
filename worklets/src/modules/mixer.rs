use super::super::modulate_core;
use super::super::module;

#[derive(Default)]
pub struct Mixer {
  inputs: [modulate_core::AudioInput; 8],
  params: [modulate_core::AudioParam; 8],
  output: modulate_core::AudioOutput,
}

impl module::Module for Mixer {
  fn process(&mut self, quantum: u64) {
    for sample in 0..modulate_core::QUANTUM_SIZE {
      let v = self
        .inputs
        .iter()
        .enumerate()
        .map(|(ix, input)| input.at(sample) * self.params[ix].at(sample, quantum))
        .sum();
      self.output[sample] = v
    }
  }

  fn get_outputs(&mut self) -> Vec<&mut modulate_core::AudioOutput> {
    vec![&mut self.output]
  }

  fn get_inputs(&mut self) -> Vec<&mut modulate_core::AudioInput> {
    self.inputs.iter_mut().collect()
  }

  fn get_parameters(&mut self) -> Vec<&mut modulate_core::AudioParam> {
    self.params.iter_mut().collect()
  }
}

impl Mixer {
  pub fn new() -> Mixer {
    Mixer::default()
  }
}
