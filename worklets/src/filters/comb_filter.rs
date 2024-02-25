use crate::delay_line::VariableDelayLine;

pub struct CombFilter {
  delay: VariableDelayLine,
  feedback: f32,
  gain: f32,
}

impl CombFilter {
  pub fn new(delay: usize, gain: f32, feedback: f32) -> CombFilter {
    CombFilter {
      delay: VariableDelayLine::new(2048, delay),
      gain,
      feedback,
    }
  }

  pub fn step(&mut self, input: f32) -> f32 {
    let delay = self.delay.read();
    self.delay.write(input + self.feedback * delay);
    input * self.gain + delay
  }
}
