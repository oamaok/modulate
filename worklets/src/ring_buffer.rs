pub struct RingBuffer {
  buffer: Vec<f32>,
  position: usize,
}

impl RingBuffer {
  pub fn new(size: usize) -> RingBuffer {
    RingBuffer {
      buffer: vec![0.0; size],
      position: 0,
    }
  }

  pub fn write(&mut self, value: f32) {
    self.buffer[self.position] = value;
    self.position += 1;
    if self.position >= self.buffer.len() {
      self.position = 0;
    }
  }

  pub fn read(&self) -> f32 {
    self.buffer[self.position]
  }
}
