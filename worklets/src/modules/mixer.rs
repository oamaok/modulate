use std::arch::wasm32::{f32x4, f32x4_add, f32x4_mul, v128, v128_load, v128_store};

use crate::{
  modulate_core::{AudioInput, AudioOutput, AudioParam, QUANTUM_SIZE},
  module::Module,
};

const CHANNELS: usize = 8;

#[derive(Default)]
pub struct Mixer {
  inputs: [AudioInput; CHANNELS],
  params: [AudioParam; CHANNELS],
  output: AudioOutput,
}

impl Module for Mixer {
  fn process(&mut self, _quantum: u64) {
    for block in 0..(QUANTUM_SIZE / 4) {
      let block = block * 4;
      let mut output = f32x4(0.0, 0.0, 0.0, 0.0);

      unsafe {
        for channel in 0..CHANNELS {
          let input = v128_load(
            (*self.inputs[channel].0)
              .previous()
              .as_ptr()
              .offset(block as isize) as *const v128,
          );
          let gain = v128_load(self.params[channel].at_f32x4(block));
          output = f32x4_add(output, f32x4_mul(input, gain));
        }

        v128_store(
          (&self.output.current().0).as_ptr().offset(block as isize) as *mut v128,
          output,
        )
      }
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
