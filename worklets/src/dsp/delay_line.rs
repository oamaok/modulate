use crate::{util::lerp, windowed_sinc::windowed_sinc_sample};

pub struct VariableDelayLineInterpolated {
  size: usize,
  buffer: Vec<f32>,
  write_pos: usize,
  current_delay: f32,
  read_speed: f32,
  delay: f32,
}

impl VariableDelayLineInterpolated {
  pub fn new(size: usize, delay: f32) -> VariableDelayLineInterpolated {
    assert!((delay as usize) < size);
    VariableDelayLineInterpolated {
      size,
      buffer: vec![0.0; size],
      write_pos: delay as usize,
      current_delay: delay,
      read_speed: 0.0,
      delay,
    }
  }

  pub fn set_delay(&mut self, delay: f32) {
    assert!(delay < self.size as f32);
    let delay = delay.max(1.0);

    if (delay - self.delay).abs() < f32::EPSILON {
      return;
    }

    self.delay = delay;
    self.read_speed = 1.0 - self.current_delay / delay;
  }

  fn read_pos(&self) -> f32 {
    let mut read_pos = self.write_pos as f32 - self.current_delay;
    if read_pos < 0.0 {
      read_pos += self.size as f32;

      // Due to floating point precision this _is_ a possible case
      if read_pos >= self.size as f32 {
        read_pos = 0.0;
      }
    }

    assert!(read_pos >= 0.0);
    assert!(read_pos < self.size as f32);

    read_pos
  }

  pub fn read_sinc(&self) -> f32 {
    windowed_sinc_sample(self.read_pos(), self.buffer.as_slice())
  }

  pub fn read_lerp(&self) -> f32 {
    let read_pos = self.read_pos();

    let read_pos_int = read_pos as usize;
    let read_pos_fract = read_pos.fract();

    let curr = self.buffer[read_pos_int];
    let next = {
      if read_pos_int == self.size - 1 {
        self.buffer[0]
      } else {
        self.buffer[read_pos_int + 1]
      }
    };

    lerp(curr, next, read_pos_fract)
  }

  pub fn write(&mut self, input: f32) {
    self.buffer[self.write_pos] = input;

    if (self.read_speed > 0.0 && self.current_delay < self.delay)
      || (self.read_speed < 0.0 && self.current_delay > self.delay)
    {
      self.current_delay += self.read_speed;
    }

    assert!(self.current_delay >= 0.0);

    self.write_pos += 1;

    if self.write_pos >= self.size {
      self.write_pos = 0;
    }
  }
}

pub struct VariableDelayLine {
  size: usize,
  buffer: Vec<f32>,
  write_pos: usize,
  read_pos: usize,
}

impl VariableDelayLine {
  pub fn new(size: usize, delay: usize) -> VariableDelayLine {
    assert!(delay < size);
    VariableDelayLine {
      size,
      buffer: vec![0.0; size],
      write_pos: delay,
      read_pos: 0,
    }
  }

  pub fn set_delay(&mut self, delay: usize) {
    assert!(delay < self.size);

    let mut read_pos = self.write_pos as i32 - delay as i32;
    if read_pos < 0 {
      read_pos += self.size as i32;
    }
    self.read_pos = read_pos as usize;
  }

  pub fn read(&self) -> f32 {
    self.buffer[self.read_pos]
  }

  pub fn write(&mut self, input: f32) {
    self.buffer[self.write_pos] = input;

    self.write_pos += 1;
    self.read_pos += 1;

    if self.write_pos >= self.size {
      self.write_pos = 0;
    }

    if self.read_pos >= self.size {
      self.read_pos = 0;
    }
  }
}
