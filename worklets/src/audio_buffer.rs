use std::ops::{Deref, DerefMut};

use crate::modulate_core::QUANTUM_SIZE;

#[derive(Clone, Copy)]
pub struct AudioBuffer(pub [f32; QUANTUM_SIZE]);

impl Deref for AudioBuffer {
  type Target = [f32; QUANTUM_SIZE];
  fn deref(&self) -> &Self::Target {
    &self.0
  }
}

impl DerefMut for AudioBuffer {
  fn deref_mut(&mut self) -> &mut [f32; QUANTUM_SIZE] {
    &mut self.0
  }
}

impl Default for AudioBuffer {
  fn default() -> AudioBuffer {
    AudioBuffer([0.0f32; QUANTUM_SIZE])
  }
}
