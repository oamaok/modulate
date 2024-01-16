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
  fn process(&mut self, _quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      // FIXME: Implement new RMS/Peak calculation for limiter
      let rms = 0.5;
      let threshold = self.threshold.at(sample);
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
  pub fn new() -> Box<Limiter> {
    Box::new(Limiter {
      input: AudioInput::default(),
      output: AudioOutput::default(),
      threshold: AudioParam::new(AudioParamModulationType::Additive),

      buffer: RingBuffer::new(500),
    })
  }
}
