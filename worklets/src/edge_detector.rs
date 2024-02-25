#[derive(PartialEq)]
pub enum Edge {
  High,
  Low,
  Rose,
  Fell,
}

impl Edge {
  pub fn is_edge(&self) -> bool {
    self == &Edge::Rose || self == &Edge::Fell
  }

  pub fn is_high(&self) -> bool {
    self == &Edge::Rose || self == &Edge::High
  }

  pub fn is_low(&self) -> bool {
    self == &Edge::Fell || self == &Edge::Low
  }

  pub fn rose(&self) -> bool {
    self == &Edge::Rose
  }

  pub fn fell(&self) -> bool {
    self == &Edge::Fell
  }
}

pub struct EdgeDetector {
  threshold: f32,
  previous_sample: f32,
}

impl Default for EdgeDetector {
  fn default() -> Self {
    EdgeDetector {
      threshold: 0.5,
      previous_sample: 0.0,
    }
  }
}

impl EdgeDetector {
  pub fn new(threshold: f32) -> EdgeDetector {
    EdgeDetector {
      threshold,
      previous_sample: 0.0,
    }
  }

  pub fn step(&mut self, sample: f32) -> Edge {
    let edge = if self.previous_sample < self.threshold && sample > self.threshold {
      Edge::Rose
    } else if self.previous_sample > self.threshold && sample < self.threshold {
      Edge::Fell
    } else {
      if sample < self.threshold {
        Edge::Low
      } else {
        Edge::High
      }
    };
    self.previous_sample = sample;

    edge
  }
}
