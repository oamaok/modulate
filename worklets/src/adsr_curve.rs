use crate::{edge_detector::EdgeDetector, modulate_core::SAMPLE_RATE_F32, util::tension_interp};

pub struct ADSRCurve {
  edge_detector: EdgeDetector,
  level: f32,
  release_level: f32,
  time: f32,

  pub attack_time: f32,
  pub attack_tension: f32,
  pub decay_time: f32,
  pub decay_tension: f32,
  pub sustain_level: f32,
  pub release_time: f32,
  pub release_tension: f32,
}

impl Default for ADSRCurve {
  fn default() -> Self {
    ADSRCurve {
      edge_detector: EdgeDetector::default(),
      level: 0.0,
      release_level: 0.0,
      time: 0.0,
      attack_time: 0.0,
      attack_tension: 0.0,
      decay_time: 0.0,
      decay_tension: 0.0,
      sustain_level: 0.0,
      release_time: 0.0,
      release_tension: 0.0,
    }
  }
}

impl ADSRCurve {
  pub fn step(&mut self, sample: f32) -> f32 {
    let edge = self.edge_detector.step(sample);

    if edge.is_edge() {
      self.time = 0.0;
      self.release_level = self.level;
    }

    self.level = 'level: {
      if edge.is_high() {
        let attack_time = self.attack_time * SAMPLE_RATE_F32;

        if self.time < attack_time {
          break 'level tension_interp(
            self.release_level,
            1.0,
            self.attack_tension,
            self.time / attack_time,
          );
        }

        let decay_time = self.decay_time * SAMPLE_RATE_F32;

        if self.time - attack_time < decay_time {
          break 'level tension_interp(
            1.0,
            self.sustain_level,
            self.decay_tension,
            (self.time - attack_time) / decay_time,
          );
        }

        self.sustain_level
      } else {
        let release_time = self.release_time * SAMPLE_RATE_F32;

        if self.time < release_time {
          break 'level tension_interp(
            self.release_level,
            0.0,
            self.release_tension,
            self.time / release_time,
          );
        }

        0.0
      }
    };

    self.time = self.time + 1.0;

    self.level
  }
}
