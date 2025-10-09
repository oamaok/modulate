#[derive(Clone, Copy)]
pub struct DcBlocker {
  prev_sample: f32,
  prev_output: f32,
}

impl Default for DcBlocker {
  fn default() -> Self {
    DcBlocker {
      prev_sample: 0.0f32,
      prev_output: 0.0f32,
    }
  }
}

impl DcBlocker {
  pub fn step(&mut self, input: f32) -> f32 {
    let output = input - self.prev_sample + 0.995f32 * self.prev_output;
    self.prev_sample = input;
    self.prev_output = output;

    output
  }
}
