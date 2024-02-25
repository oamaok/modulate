use std::arch::wasm32::{
  f32x4, f32x4_add, f32x4_max, f32x4_min, f32x4_mul, f32x4_sub, v128, v128_load, v128_store,
};

use crate::{
  audio_input::AudioInput,
  modulate_core::{QUANTUM_SIZE, SAMPLE_RATE_F32},
};

pub enum AudioParamModulationType {
  Multiplicative,
  Additive,
}

pub struct AudioParam {
  modulation_type: AudioParamModulationType,
  target: f32,
  previous: f32,
  buffer: [f32; QUANTUM_SIZE],
  modulated_buffer: [f32; QUANTUM_SIZE],
  target_set_at_quantum: u64,
  will_change: bool,
  pub modulation: AudioInput,
}

impl Default for AudioParam {
  fn default() -> Self {
    AudioParam {
      modulation_type: AudioParamModulationType::Additive,
      target: 0.0,
      previous: 0.0,
      buffer: [0.0; QUANTUM_SIZE],
      modulated_buffer: [0.0; QUANTUM_SIZE],
      target_set_at_quantum: 0,
      modulation: AudioInput::default(),
      will_change: true,
    }
  }
}

const INV_PARAMETER_SMOOTHING_TIME: f32 = 1.0 / (SAMPLE_RATE_F32 * 0.01/* samples */);

impl AudioParam {
  pub fn new(modulation_type: AudioParamModulationType) -> AudioParam {
    AudioParam {
      modulation_type,
      target: 0.0,
      previous: 0.0,
      buffer: [0.0; QUANTUM_SIZE],
      modulated_buffer: [0.0; QUANTUM_SIZE],
      target_set_at_quantum: 0,
      modulation: AudioInput::default(),
      will_change: true,
    }
  }

  pub fn process(&mut self, quantum: u64) {
    let mut t = [0.0; 4];

    let dq = ((quantum as i64) - (self.target_set_at_quantum as i64)) as f32;

    for i in 0..4 {
      let ds = dq * 128.0 + i as f32;
      t[i] = ds * INV_PARAMETER_SMOOTHING_TIME;
    }

    let t_increment = (t[1] - t[0]) * 4.0;

    unsafe {
      let mut t = v128_load(t.as_ptr() as *const v128);
      let t_increment = f32x4(t_increment, t_increment, t_increment, t_increment);

      let zero = f32x4(0.0, 0.0, 0.0, 0.0);
      let one = f32x4(1.0, 1.0, 1.0, 1.0);

      let target = f32x4(self.target, self.target, self.target, self.target);
      let previous = f32x4(self.previous, self.previous, self.previous, self.previous);

      for block in 0..(QUANTUM_SIZE / 4) {
        let block = block * 4;
        let clamped_t = f32x4_max(zero, f32x4_min(one, t));

        v128_store(
          self.buffer.as_mut_ptr().offset(block as isize) as *mut v128,
          f32x4_add(previous, f32x4_mul(clamped_t, f32x4_sub(target, previous))),
        );

        t = f32x4_add(t, t_increment);
      }
    }

    let modulation_ptr = unsafe { (*self.modulation.0).read_buffer().as_ptr() };

    match self.modulation_type {
      AudioParamModulationType::Additive => unsafe {
        for block in 0..(QUANTUM_SIZE / 4) {
          let block = block * 4;

          let value = v128_load((self.buffer.as_ptr().offset(block as isize)) as *const v128);
          let modulation = v128_load((modulation_ptr.offset(block as isize)) as *const v128);

          v128_store(
            self.modulated_buffer.as_mut_ptr().offset(block as isize) as *mut v128,
            f32x4_add(value, modulation),
          );
        }
      },
      AudioParamModulationType::Multiplicative => unsafe {
        for block in 0..(QUANTUM_SIZE / 4) {
          let block = block * 4;

          let value = v128_load((self.buffer.as_ptr().offset(block as isize)) as *const v128);
          let modulation = v128_load((modulation_ptr.offset(block as isize)) as *const v128);

          v128_store(
            self.modulated_buffer.as_mut_ptr().offset(block as isize) as *mut v128,
            f32x4_mul(value, modulation),
          );
        }
      },
    }
  }

  pub fn set_target(&mut self, target: f32, target_set_at_quantum: u64) {
    self.target = target;
    self.target_set_at_quantum = target_set_at_quantum;
    self.previous = self.buffer[QUANTUM_SIZE - 1];
  }

  pub fn at(&mut self, sample: usize) -> f32 {
    self.modulated_buffer[sample]
  }

  pub fn at_f32x4(&mut self, sample: usize) -> *const v128 {
    debug_assert!(sample + 4 <= QUANTUM_SIZE);

    unsafe { self.modulated_buffer.as_ptr().offset(sample as isize) as *const v128 }
  }
}
