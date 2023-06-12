use super::super::modulate_core;
use super::super::module;

#[derive(Default)]
pub struct Clock {
  outputs: [modulate_core::AudioOutput; 3],

  tempo: modulate_core::AudioParam,
  ratios: [modulate_core::AudioParam; 3],
  pulse_widths: [modulate_core::AudioParam; 3],
  swing_ratios: [modulate_core::AudioParam; 3],

  is_running: bool,
  cycle_positions: [usize; 3],
}

impl module::Module for Clock {
  fn process(&mut self) {
    for sample in 0..modulate_core::QUANTUM_SIZE {
      for output in 0..3 {
        if !self.is_running {
          self.outputs[output][sample] = 0.0;
          continue;
        }

        let samples_per_beat = 60.0 / self.tempo.at(sample) * modulate_core::SAMPLE_RATE as f32
          / self.ratios[output].at(sample);

        let odd_end = samples_per_beat * self.pulse_widths[output].at(sample);
        let even_start =
          samples_per_beat + (self.swing_ratios[output].at(sample) - 0.5) * samples_per_beat * 2.0;
        let even_end = even_start + odd_end;
        let pos = self.cycle_positions[output];
        if pos < odd_end as usize {
          self.outputs[output][sample] = 1.0;
        } else if pos > even_start as usize && pos < even_end as usize {
          self.outputs[output][sample] = 1.0;
        } else {
          self.outputs[output][sample] = 0.0;
        }
        self.cycle_positions[output] += 1;
        if self.cycle_positions[output] > (samples_per_beat * 2.0) as usize {
          self.cycle_positions[output] = 0;
        }
      }
    }
  }

  fn on_message(&mut self, message: module::ModuleMessage) {
    match message {
      module::ModuleMessage::ClockReset => {
        for output in 0..3 {
          self.cycle_positions[output] = 0;
        }
      }
      module::ModuleMessage::ClockSetRunning { running } => self.is_running = running,
      _ => panic!("clock: received unhandled message"),
    }
  }

  fn get_parameters(&mut self) -> Vec<&mut modulate_core::AudioParam> {
    let mut params = vec![&mut self.tempo];

    for ratio in self.ratios.iter_mut() {
      params.push(ratio);
    }

    for pulse_width in self.pulse_widths.iter_mut() {
      params.push(pulse_width);
    }

    for swing_ratio in self.swing_ratios.iter_mut() {
      params.push(swing_ratio);
    }

    params
  }

  fn get_outputs(&mut self) -> Vec<&mut modulate_core::AudioOutput> {
    self.outputs.iter_mut().map(|out| out).collect()
  }
}

impl Clock {
  pub fn new() -> Clock {
    Clock::default()
  }
}
