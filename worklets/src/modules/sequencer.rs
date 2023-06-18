use super::super::modulate_core;
use super::super::module;

#[derive(Clone, Copy)]
struct Note {
  voltage: f32,
  glide: bool,
  gate: bool,
}

impl Default for Note {
  fn default() -> Note {
    Note {
      voltage: 0.0,
      gate: true,
      glide: false,
    }
  }
}

fn note_to_voltage(note: &String) -> f32 {
  match note.as_str() {
    "C" => -9.0 / 12.0,
    "C#" => -8.0 / 12.0,
    "D" => -7.0 / 12.0,
    "D#" => -6.0 / 12.0,
    "E" => -5.0 / 12.0,
    "F" => -4.0 / 12.0,
    "F#" => -3.0 / 12.0,
    "G" => -2.0 / 12.0,
    "G#" => -1.0 / 12.0,
    "A" => 0.0 / 12.0,
    "A#" => 1.0 / 12.0,
    "B" => 2.0 / 12.0,
    _ => panic!("unknown note {}", note),
  }
}

#[derive(Default)]
pub struct Sequencer {
  gate_input: modulate_core::AudioInput,
  sequence_length: modulate_core::AudioParam,
  glide: modulate_core::AudioParam,
  cv_output: modulate_core::AudioOutput,
  gate_output: modulate_core::AudioOutput,

  notes: [Note; 32],
  current_step: usize,
  edge_detector: modulate_core::EdgeDetector,
  time: usize,
  previous_voltage: f32,

  events: Vec<module::ModuleEvent>,
}

impl module::Module for Sequencer {
  fn process(&mut self) {
    for sample in 0..modulate_core::QUANTUM_SIZE {
      let edge = self.edge_detector.step(self.gate_input.at(sample));

      let note = &self.notes[self.current_step];

      let voltage = if note.glide {
        let t = f32::clamp(
          self.time as f32
            / f32::max(
              1.0,
              modulate_core::SAMPLE_RATE as f32 * self.glide.at(sample),
            ),
          0.0,
          1.0,
        );

        modulate_core::lerp(self.previous_voltage, note.voltage, t)
      } else {
        note.voltage
      };

      match edge {
        modulate_core::Edge::Rose => {
          self.current_step += 1;
          self.time = 0;
          self.previous_voltage = voltage;

          if self.current_step >= self.sequence_length.at(sample) as usize {
            self.current_step = 0;
          }

          self.events.push(module::ModuleEvent::SequencerAdvance {
            position: self.current_step,
          });
        }
        _ => {}
      }

      self.cv_output[sample] = voltage;

      self.time += 1;

      if note.gate {
        self.gate_output[sample] = self.gate_input.at(sample);
      } else {
        self.gate_output[sample] = 0.0;
      }
    }
  }

  fn pop_event(&mut self) -> Option<module::ModuleEvent> {
    self.events.pop()
  }

  fn on_message(&mut self, message: module::ModuleMessage) {
    match message {
      module::ModuleMessage::SequencerSetNotes { notes } => {
        for (i, note) in notes.iter().enumerate() {
          let voltage = note_to_voltage(&note.name) - 4.0 + note.octave;

          self.notes[i].voltage = voltage;
          self.notes[i].gate = note.gate;
          self.notes[i].glide = note.glide;
        }
      }
      _ => panic!("sequencer: received unhandled message"),
    };
  }

  fn get_inputs(&mut self) -> Vec<&mut modulate_core::AudioInput> {
    vec![&mut self.gate_input]
  }

  fn get_parameters(&mut self) -> Vec<&mut modulate_core::AudioParam> {
    vec![&mut self.sequence_length, &mut self.glide]
  }

  fn get_outputs(&mut self) -> Vec<&mut modulate_core::AudioOutput> {
    vec![&mut self.cv_output, &mut self.gate_output]
  }
}

impl Sequencer {
  pub fn new() -> Sequencer {
    Sequencer::default()
  }
}
