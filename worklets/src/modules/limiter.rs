use crate::{
  modulate_core::{
    AudioInput, AudioOutput, AudioParam, AudioParamModulationType, RingBuffer, QUANTUM_SIZE,
  },
  module::Module,
};

pub struct Limiter {
  input: AudioInput,
  output: AudioOutput,
  threshold: AudioParam,

  buffer: RingBuffer,
}

impl Module for Limiter {
  fn process(&mut self, quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      let rms = self.buffer.rms();
      let threshold = self.threshold.at(sample, quantum);
      let ratio = if rms > threshold {
        threshold / rms
      } else {
        1.0
      };
      self.output[sample] = self.buffer.head() * ratio;
      self.buffer.write(self.input.at(sample));
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![&mut self.threshold]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }
}

impl Limiter {
  pub fn new() -> Limiter {
    Limiter {
      input: AudioInput::default(),
      output: AudioOutput::default(),
      threshold: AudioParam::new(AudioParamModulationType::Additive),

      buffer: RingBuffer::new(500),
    }
  }
}
