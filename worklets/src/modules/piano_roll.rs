use std::cmp::Ordering;

use crate::{
  modulate_core::{AudioInput, AudioOutput, AudioParam, INV_SAMPLE_RATE, QUANTUM_SIZE},
  module::{Module, ModuleEvent, ModuleMessage, PianoRollNote},
};

const BAR_LENGTH: f32 = 2.0 * 2.0 * 3.0 * 4.0 * 5.0;

#[derive(Default)]
pub struct PianoRoll {
  cv_output: AudioOutput,
  gate_output: AudioOutput,

  length: AudioParam,
  speed: AudioParam,
  external_clock: AudioInput,

  last_cv: f32,
  position: f32,
  notes: Vec<PianoRollNote>,

  events: Vec<ModuleEvent>,
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

      self.position += self.speed.at(sample) * (BAR_LENGTH / 4.0 * INV_SAMPLE_RATE);
      let length = self.length.at(sample) * BAR_LENGTH / 4.0;
      if self.position > length {
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

  fn pop_event(&mut self) -> Option<ModuleEvent> {
    self.events.pop()
  }
}

impl PianoRoll {
  pub fn init(&mut self) {
    self.events.push({
      ModuleEvent::PianoRollPointers {
        position: &mut self.position as *mut f32 as usize,
      }
    });
  }

  pub fn new() -> PianoRoll {
    PianoRoll::default()
  }
}
