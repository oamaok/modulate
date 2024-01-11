use crate::{
  modulate_core::{AudioInput, AudioOutput, AudioParam, RingBuffer, QUANTUM_SIZE, SAMPLE_RATE},
  module::Module,
};

pub struct Delay {
  input: AudioInput,
  output: AudioOutput,

  time: AudioParam,
  feedback: AudioParam,
  wet: AudioParam,
  dry: AudioParam,

  buffer: RingBuffer,
}

impl Module for Delay {
  fn process(&mut self, _quantum: u64) {
    self
      .buffer
      .resize((self.time.at(0) * SAMPLE_RATE as f32) as usize);

    for sample in 0..QUANTUM_SIZE {
      let input = self.input.at(sample);
      let wet = self.buffer.head();
      self.buffer.write(input + wet * self.feedback.at(sample));
      self.output[sample] = wet * self.wet.at(sample) + input * self.dry.at(sample);
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.time,
      &mut self.feedback,
      &mut self.wet,
      &mut self.dry,
    ]
  }
}

impl Delay {
  pub fn new() -> Box<Delay> {
    Box::new(Delay {
      input: AudioInput::default(),
      output: AudioOutput::default(),

      time: AudioParam::default(),
      feedback: AudioParam::default(),
      wet: AudioParam::default(),
      dry: AudioParam::default(),

      buffer: RingBuffer::new(10000),
    })
  }
}
