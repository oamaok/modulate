use std::cmp::Ordering;

use crate::{
  audio_input::AudioInput,
  audio_output::AudioOutput,
  audio_param::AudioParam,
  edge_detector::EdgeDetector,
  modulate_core::{INV_SAMPLE_RATE, QUANTUM_SIZE},
  module::{Module, ModuleMessage, PianoRollNote},
};

const BAR_LENGTH: f32 = 64.0 * 3.0 * 5.0 * 7.0;

#[derive(Default)]
pub struct PianoRoll {
  cv_output: AudioOutput,
  gate_output: AudioOutput,

  length: AudioParam,
  speed: AudioParam,
  external_clock_: AudioParam,
  external_clock: AudioInput,

  edge_detector: EdgeDetector,

  last_cv: f32,
  position: f32,
  ext_position: f32,
  notes: Vec<PianoRollNote>,
}

impl Module for PianoRoll {
  fn process(&mut self, _quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      let mut gate = 0.0;

      for note in self.notes.iter() {
        if note.start <= self.position && note.start + note.length > self.position {
          self.last_cv = note.pitch / 12.0;
          gate = 1.0;
        }
      }

      self.cv_output[sample] = self.last_cv;
      self.gate_output[sample] = gate;

      if self.external_clock.is_connected() {
        let edge = self.edge_detector.step(self.external_clock.at(sample));

        if edge.rose() {
          self.ext_position += 1.0;
          self.position = self.ext_position * BAR_LENGTH / 32.0;
        }
      } else {
        self.ext_position = 0.0;
        self.position += self.speed.at(sample) * (BAR_LENGTH / 4.0 * INV_SAMPLE_RATE);
      }

      let length = self.length.at(sample) * BAR_LENGTH / 4.0;
      if self.position >= length {
        self.position -= length;
      }
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.external_clock]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![&mut self.length, &mut self.speed]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.cv_output, &mut self.gate_output]
  }

  fn on_message(&mut self, message: ModuleMessage) {
    match message {
      ModuleMessage::PianoRollSetNotes { notes } => {
        self.notes = notes;
        self
          .notes
          .sort_by(|a, b| -> Ordering { a.start.total_cmp(&b.start) });
      }

      _ => panic!("PianoRoll: invalid message"),
    }
  }
  fn get_pointers(&mut self) -> Vec<usize> {
    vec![&mut self.position as *mut f32 as usize]
  }
}

impl PianoRoll {
  pub fn new() -> Box<PianoRoll> {
    Box::new(PianoRoll::default())
  }
}
