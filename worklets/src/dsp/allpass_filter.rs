use crate::ring_buffer::RingBuffer;

pub struct AllpassFilter {
  feedback_delay: RingBuffer,
  input_delay: RingBuffer,
  gain: f32,
}

impl AllpassFilter {
  pub fn new(delay: usize, gain: f32) -> AllpassFilter {
    AllpassFilter {
      feedback_delay: RingBuffer::new(delay),
      input_delay: RingBuffer::new(delay),
      gain,
    }
  }

  pub fn set_gain(&mut self, gain: f32) {
    self.gain = gain;
  }

  pub fn step(&mut self, input: f32) -> f32 {
    let output =
      input * self.gain + self.input_delay.read() - self.gain * self.feedback_delay.read();
    self.feedback_delay.write(output);
    self.input_delay.write(input);

    output
  }
}
