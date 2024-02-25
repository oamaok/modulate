use std::ops::{Index, IndexMut};

use crate::{audio_buffer::AudioBuffer, modulate_core::AUDIO_OUTPUT_NUM_BUFFERS};

pub struct AudioOutput {
  pub buffers: [AudioBuffer; AUDIO_OUTPUT_NUM_BUFFERS],
  pub current: usize,
}

impl Index<usize> for AudioOutput {
  type Output = f32;
  fn index(&self, i: usize) -> &f32 {
    &self.buffers[self.current][i]
  }
}

impl IndexMut<usize> for AudioOutput {
  fn index_mut(&mut self, i: usize) -> &mut f32 {
    &mut self.buffers[self.current][i]
  }
}

impl Default for AudioOutput {
  fn default() -> Self {
    AudioOutput {
      buffers: [AudioBuffer::default(); AUDIO_OUTPUT_NUM_BUFFERS],
      current: 0,
    }
  }
}

impl AudioOutput {
  pub fn swap(&mut self) {
    self.current = (self.current + 1) % AUDIO_OUTPUT_NUM_BUFFERS;
  }

  pub fn write_buffer(&self) -> &AudioBuffer {
    &self.buffers[self.current]
  }

  pub fn write_buffer_mut(&mut self) -> &mut AudioBuffer {
    &mut self.buffers[self.current]
  }

  pub fn read_buffer(&self) -> &AudioBuffer {
    let prev = (self.current + AUDIO_OUTPUT_NUM_BUFFERS - 1) % AUDIO_OUTPUT_NUM_BUFFERS;
    &self.buffers[prev]
  }
}
