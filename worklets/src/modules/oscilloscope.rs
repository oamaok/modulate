use crate::audio_buffer::AudioBuffer;
use crate::audio_input::AudioInput;
use crate::audio_output::AudioOutput;
use crate::audio_param::AudioParam;
use crate::{
  modulate_core::QUANTUM_SIZE,
  module::{Module, ModuleEvent},
  NUM_OUTPUT_BUFFERS,
};

const HISTORY_LENGTH: usize = NUM_OUTPUT_BUFFERS * 16;

pub struct Oscilloscope {
  x_input: AudioInput,
  y_input: AudioInput,
  x_history: [AudioBuffer; HISTORY_LENGTH],
  y_history: [AudioBuffer; HISTORY_LENGTH],

  current_buf: usize,
  events: Vec<ModuleEvent>,
}

impl Module for Oscilloscope {
  fn process(&mut self, _quantum: u64) {
    if self.current_buf >= HISTORY_LENGTH {
      self.current_buf = 0;
    }

    for sample in 0..QUANTUM_SIZE {
      self.x_history[self.current_buf][sample] = self.x_input.at(sample);
      self.y_history[self.current_buf][sample] = self.y_input.at(sample);
    }

    self.current_buf += 1;
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.x_input, &mut self.y_input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![]
  }

  fn pop_event(&mut self) -> Option<ModuleEvent> {
    self.events.pop()
  }
}

impl Oscilloscope {
  pub fn new(start_pos: usize) -> Box<Oscilloscope> {
    let mut module = Box::new(Oscilloscope {
      x_input: AudioInput::default(),
      y_input: AudioInput::default(),
      x_history: [AudioBuffer::default(); HISTORY_LENGTH],
      y_history: [AudioBuffer::default(); HISTORY_LENGTH],
      current_buf: start_pos,
      events: vec![],
    });

    module.init();

    module
  }

  pub fn init(&mut self) {
    self.events.push({
      ModuleEvent::OscilloscopePointers {
        x_ptr: &mut self.x_history[0].0 as *mut f32 as usize,
        y_ptr: &mut self.y_history[0].0 as *mut f32 as usize,
      }
    });
  }
}
