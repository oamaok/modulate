use crate::audio_output::AudioOutput;
use crate::{
  modulate_core::QUANTUM_SIZE,
  module::{Module, ModuleMessage},
};

const MIDI_NOTE_OFF: u32 = 0b1000;
const MIDI_NOTE_ON: u32 = 0b1001;
// const MIDI_KEY_PRESSURE: u32 = 0b1010;
// const MIDI_CONTROL_CHANGE: u32 = 0b1011;
// const MIDI_PROGRAM_CHANGE: u32 = 0b1100;
// const MIDI_CHANNEL_PRESSURE: u32 = 0b1101;
// const MIDI_PITCH_BEND_CHANGE: u32 = 0b1110;

pub struct MIDI {
  cv_output: AudioOutput,
  velocity_output: AudioOutput,
  gate_output: AudioOutput,

  current_cv: f32,

  note_velocities: [u8; 128],
}

impl Module for MIDI {
  fn process(&mut self, _quantum: u64) {
    let mut velocity = 0.0;

    for note in 0..128 {
      let index = 127 - note;

      if self.note_velocities[index] > 0 {
        self.current_cv = ((index as f32) - 57.0) / 12.0;
        velocity = (self.note_velocities[index] as f32) / 128.0;
        break;
      }
    }

    for sample in 0..QUANTUM_SIZE {
      self.cv_output[sample] = self.current_cv;
      self.velocity_output[sample] = velocity;
      self.gate_output[sample] = if velocity == 0.0 { 0.0 } else { 1.0 };
    }
  }

  fn on_message(&mut self, message: ModuleMessage) {
    match message {
      ModuleMessage::MidiMessage { message } => {
        let message_type = (message >> 4) & 0b0000_1111;

        match message_type {
          MIDI_NOTE_ON => {
            let note = (message >> 8) & 0b0111_1111;
            let velocity = (message >> 16) & 0b0111_1111;

            self.note_velocities[note as usize] = velocity as u8;
          }

          MIDI_NOTE_OFF => {
            let note = (message >> 8) & 0b0111_1111;

            self.note_velocities[note as usize] = 0;
          }

          _ => {}
        }
      }
      _ => panic!("midi: received unhandled message"),
    }
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![
      &mut self.cv_output,
      &mut self.velocity_output,
      &mut self.gate_output,
    ]
  }
}
impl MIDI {
  pub fn new() -> Box<MIDI> {
    Box::new(MIDI {
      cv_output: AudioOutput::default(),
      velocity_output: AudioOutput::default(),
      gate_output: AudioOutput::default(),

      current_cv: 0.0,

      note_velocities: [0; 128],
    })
  }
}
