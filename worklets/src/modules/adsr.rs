use super::super::modulate_core;
use super::super::module;

#[derive(Default)]
pub struct ADSR {
  gate_input: modulate_core::AudioInput,
  output: modulate_core::AudioOutput,

  attack: modulate_core::AudioParam,
  decay: modulate_core::AudioParam,
  sustain: modulate_core::AudioParam,
  release: modulate_core::AudioParam,

  edge_detector: modulate_core::EdgeDetector,
  time: f32,
  release_level: f32,
  level: f32,
}

impl module::Module for ADSR {
  fn process(&mut self, quantum: u64) {
    for sample in 0..modulate_core::QUANTUM_SIZE {
      let edge = self.edge_detector.step(self.gate_input.at(sample));

      if edge.is_edge() {
        self.release_level = self.level;
        self.time = 0.0;
      }

      if edge == modulate_core::Edge::High {
        let attack = self.attack.at(sample, quantum);
        let decay = self.decay.at(sample, quantum);
        let sustain = self.sustain.at(sample, quantum);

        let attack_time = self.time * modulate_core::INV_SAMPLE_RATE / attack;
        let decay_time = (self.time - attack * modulate_core::SAMPLE_RATE as f32)
          * modulate_core::INV_SAMPLE_RATE
          / decay;

        if attack_time < 1.0 {
          self.level = modulate_core::lerp(self.release_level, 1.0, attack_time);
        } else if decay_time < 1.0 {
          self.level = modulate_core::lerp(1.0, sustain, decay_time);
        } else {
          self.level = sustain;
        }
      } else {
        let release_time =
          self.time * modulate_core::INV_SAMPLE_RATE / self.release.at(sample, quantum);
        if release_time < 1.0 {
          self.level = modulate_core::lerp(self.release_level, 0.0, release_time)
        } else {
          self.level = 0.0
        }
      }

      self.output[sample] = self.level;
      self.time += 1.0;
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut modulate_core::AudioInput> {
    vec![&mut self.gate_input]
  }

  fn get_parameters(&mut self) -> Vec<&mut modulate_core::AudioParam> {
    vec![
      &mut self.attack,
      &mut self.decay,
      &mut self.sustain,
      &mut self.release,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut modulate_core::AudioOutput> {
    vec![&mut self.output]
  }
}

impl ADSR {
  pub fn new() -> ADSR {
    ADSR::default()
  }
}
