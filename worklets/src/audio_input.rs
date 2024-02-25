use std::ptr::eq;

use crate::{
  audio_buffer::AudioBuffer,
  audio_output::AudioOutput,
  modulate_core::{AUDIO_OUTPUT_NUM_BUFFERS, QUANTUM_SIZE},
};

const EMPTY_AUDIO_OUTPUT: &AudioOutput = &(AudioOutput {
  buffers: [AudioBuffer([0.0; QUANTUM_SIZE]); AUDIO_OUTPUT_NUM_BUFFERS],
  current: 0,
});

#[derive(PartialEq)]
pub struct AudioInput(pub *const AudioOutput);

impl Default for AudioInput {
  fn default() -> Self {
    AudioInput(EMPTY_AUDIO_OUTPUT)
  }
}

impl AudioInput {
  pub fn at(&self, sample: usize) -> f32 {
    unsafe { (*self.0).read_buffer()[sample] }
  }

  pub fn set_ptr(&mut self, ptr: *const AudioOutput) {
    self.0 = ptr;
  }

  pub fn reset_ptr(&mut self) {
    self.0 = EMPTY_AUDIO_OUTPUT;
  }

  pub fn is_connected(&self) -> bool {
    !eq(self.0, EMPTY_AUDIO_OUTPUT)
  }
}
