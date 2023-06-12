use super::super::modulate_core;
use super::super::module;

pub struct Limiter {
  input: modulate_core::AudioInput,
  output: modulate_core::AudioOutput,
  threshold: modulate_core::AudioParam,

  buffer: modulate_core::RingBuffer,
}

impl module::Module for Limiter {
  fn process(&mut self) {
    for sample in 0..modulate_core::QUANTUM_SIZE {
      let rms = self.buffer.rms();
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

  fn get_inputs(&mut self) -> Vec<&mut modulate_core::AudioInput> {
    vec![&mut self.input]
  }

  fn get_parameters(&mut self) -> Vec<&mut modulate_core::AudioParam> {
    vec![&mut self.threshold]
  }

  fn get_outputs(&mut self) -> Vec<&mut modulate_core::AudioOutput> {
    vec![&mut self.output]
  }
}

impl Limiter {
  pub fn new() -> Limiter {
    Limiter {
      input: modulate_core::AudioInput::default(),
      output: modulate_core::AudioOutput::default(),
      threshold: modulate_core::AudioParam::new(modulate_core::AudioParamModulationType::Additive),

      buffer: modulate_core::RingBuffer::new(500),
    }
  }
}
