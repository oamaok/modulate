use super::super::modulate_core;
use super::super::module;

pub struct Delay {
  input: modulate_core::AudioInput,
  output: modulate_core::AudioOutput,

  time: modulate_core::AudioParam,
  feedback: modulate_core::AudioParam,
  wet: modulate_core::AudioParam,
  dry: modulate_core::AudioParam,

  buffer: modulate_core::RingBuffer,
}

impl module::Module for Delay {
  fn process(&mut self) {
    self
      .buffer
      .resize((self.time.at(0) * modulate_core::SAMPLE_RATE as f32) as usize);

    for sample in 0..modulate_core::QUANTUM_SIZE {
      let input = self.input.at(sample);
      let wet = self.buffer.head();
      self.buffer.write(input + wet * self.feedback.at(sample));
      self.output[sample] = wet * self.wet.at(sample) + input * self.dry.at(sample);
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut modulate_core::AudioInput> {
    vec![&mut self.input]
  }

  fn get_outputs(&mut self) -> Vec<&mut modulate_core::AudioOutput> {
    vec![&mut self.output]
  }

  fn get_parameters(&mut self) -> Vec<&mut modulate_core::AudioParam> {
    vec![
      &mut self.time,
      &mut self.feedback,
      &mut self.wet,
      &mut self.dry,
    ]
  }
}

impl Delay {
  pub fn new() -> Delay {
    Delay {
      input: modulate_core::AudioInput::default(),
      output: modulate_core::AudioOutput::default(),

      time: modulate_core::AudioParam::default(),
      feedback: modulate_core::AudioParam::default(),
      wet: modulate_core::AudioParam::default(),
      dry: modulate_core::AudioParam::default(),

      buffer: modulate_core::RingBuffer::new(10000),
    }
  }
}
