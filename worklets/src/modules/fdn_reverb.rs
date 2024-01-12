use std::arch::wasm32::{f32x4, f32x4_add, f32x4_mul, f32x4_splat, v128, v128_store};

use crate::{
  modulate_core::{lerp, AudioInput, AudioOutput, AudioParam, QUANTUM_SIZE},
  module::Module,
};

pub struct FDNReverb {
  input: AudioInput,
  output: AudioOutput,
  dry_wet: AudioParam,
  mod_amount: AudioParam,
  mod_speed: AudioParam,
  decay: AudioParam,

  delay_buffers: [[f32; 16384]; 4],
  delay_lengths: [usize; 4],
  delay_positions: [usize; 4],

  modulation: f32,
}

type Vec4 = [f32; 4];

impl Module for FDNReverb {
  fn process(&mut self, _quantum: u64) {
    // Hadamard matrix by column
    // Reference: https://www.dsprelated.com/freebooks/pasp/FDN_Reverberation.html
    let mat_col0 = f32x4(1.0, -1.0, -1.0, 1.0);
    let mat_col1 = f32x4(1.0, 1.0, -1.0, -1.0);
    let mat_col2 = f32x4(1.0, -1.0, 1.0, -1.0);
    let mat_col3 = f32x4(1.0, 1.0, 1.0, 1.0);

    for sample in 0..QUANTUM_SIZE {
      let input = self.input.at(sample);
      let mod_amount = self.mod_amount.at(sample);
      let mod_speed = self.mod_speed.at(sample);
      let decay = self.decay.at(sample);

      let mut vec: Vec4 = [0.0, 0.0, 0.0, 0.0];
      let mut sum = 0.0;

      for i in 0..4 {
        let phase_offset = 1.5708 * i as f32;

        vec[i] = {
          let modulation = ((self.modulation).sin() + phase_offset) * mod_amount * 10.0;
          let mod_frac = modulation.fract();
          let mod_int = modulation as usize;

          let pos = &self.delay_positions[i];
          let len = &self.delay_lengths[i];
          let buf = &self.delay_buffers[i];

          lerp(
            buf[(pos + mod_int) % len],
            buf[(pos + 1 + mod_int) % len],
            mod_frac,
          )
        };

        sum += vec[i];
      }

      // Mat4x4 x Vec4 multiplication
      let mut mul_res = f32x4_mul(mat_col0, f32x4_splat(vec[0]));
      mul_res = f32x4_add(mul_res, f32x4_mul(mat_col1, f32x4_splat(vec[1])));
      mul_res = f32x4_add(mul_res, f32x4_mul(mat_col2, f32x4_splat(vec[2])));
      mul_res = f32x4_add(mul_res, f32x4_mul(mat_col3, f32x4_splat(vec[3])));

      let mut feedback: Vec4 = [0.0; 4];
      unsafe {
        v128_store(feedback.as_mut_ptr() as *mut v128, mul_res);
      }

      for i in 0..4 {
        self.delay_buffers[i][self.delay_positions[i]] = input + feedback[i] * decay;
        self.delay_positions[i] += 1;

        if self.delay_positions[i] > self.delay_lengths[i] {
          self.delay_positions[i] = 0;
        }
      }

      self.modulation += mod_speed * 0.005;

      let dry_wet = self.dry_wet.at(sample);

      self.output[sample] = (input * dry_wet) + sum * (1.0 - dry_wet);
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.dry_wet,
      &mut self.mod_amount,
      &mut self.mod_speed,
      &mut self.decay,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }
}

impl FDNReverb {
  pub fn new() -> Box<FDNReverb> {
    Box::new(FDNReverb {
      input: AudioInput::default(),
      output: AudioOutput::default(),
      dry_wet: AudioParam::default(),
      mod_amount: AudioParam::default(),
      mod_speed: AudioParam::default(),
      decay: AudioParam::default(),

      modulation: 0.0,

      delay_buffers: [[0.0; 16384]; 4],
      delay_lengths: [2087, 1531, 1997, 1193],
      delay_positions: [0; 4],
    })
  }
}
