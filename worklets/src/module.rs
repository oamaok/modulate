use super::modulate_core;
use super::vec;
use serde::{Deserialize, Serialize};

pub type ModuleId = u32;
pub type ConnectionId = u32;
pub type OutputId = usize;
pub type ParameterId = usize;
pub type InputId = usize;

#[derive(Copy, Clone, Default, Serialize)]
pub struct Ball {
  pub pos: vec::Vec2,
  pub vel: vec::Vec2,
}

#[derive(Serialize)]
#[serde(tag = "type")]
pub enum ModuleEvent {
  SequencerAdvance { position: usize },
  BouncyBoiUpdate { balls: [Ball; 3], phase: f32 },
  SamplerAllocateSuccess { ptr: usize },
  SamplerPlayheadPtr { ptr: usize },
  VirtualControllerPointers { pressed_keys: usize, pads: usize },
  PianoRollPointers { position: usize },
  OscilloscopePointers { x_ptr: usize, y_ptr: usize },
}

#[derive(Serialize)]
pub struct ModuleEventWithId {
  pub id: ModuleId,
  pub event: ModuleEvent,
}

#[derive(Deserialize)]
pub struct NamedNote {
  pub name: String,
  pub octave: f32,
  pub gate: bool,
  pub glide: bool,
}

#[derive(Deserialize)]
pub struct PianoRollNote {
  pub pitch: f32,
  pub start: f32,
  pub length: f32,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
pub enum ModuleMessage {
  SequencerSetNotes { notes: Vec<NamedNote> },

  ClockReset,
  ClockSetRunning { running: bool },

  MidiMessage { message: u32 },

  SamplerAllocate { size: usize },

  PianoRollSetNotes { notes: Vec<PianoRollNote> },
}

pub trait Module {
  fn process(&mut self, _quantum: u64);
  fn get_outputs(&mut self) -> Vec<&mut modulate_core::AudioOutput> {
    vec![]
  }
  fn get_inputs(&mut self) -> Vec<&mut modulate_core::AudioInput> {
    vec![]
  }
  fn get_parameters(&mut self) -> Vec<&mut modulate_core::AudioParam> {
    vec![]
  }
  fn get_input_count(&mut self) -> usize {
    self.get_inputs().len()
  }
  fn get_output_count(&mut self) -> usize {
    self.get_outputs().len()
  }
  fn swap_output_buffers(&mut self) {
    for buffer in self.get_outputs().iter_mut() {
      buffer.swap();
    }
  }
  fn get_output_buffer_ptr(&mut self, output: OutputId) -> *const modulate_core::AudioOutput {
    let ptr = self
      .get_outputs()
      .get(output)
      .map(|x| *x as *const modulate_core::AudioOutput)
      .unwrap();
    ptr
  }

  fn set_input_buffer_ptr(
    &mut self,
    input: InputId,
    buffer_ptr: *const modulate_core::AudioOutput,
  ) {
    let mut inputs = self.get_inputs();
    let buffer = inputs.get_mut(input).unwrap();
    buffer.set_ptr(buffer_ptr);
  }

  fn reset_input_buffer_ptr(&mut self, input: InputId) {
    let mut inputs = self.get_inputs();
    let buffer = inputs.get_mut(input).unwrap();
    buffer.reset_ptr();
  }

  fn set_parameter_buffer_ptr(
    &mut self,
    param: ParameterId,
    buffer_ptr: *const modulate_core::AudioOutput,
  ) {
    let mut params = self.get_parameters();
    let buffer = params.get_mut(param).unwrap();
    buffer.modulation.set_ptr(buffer_ptr);
  }

  fn reset_parameter_buffer_ptr(&mut self, param: ParameterId) {
    let mut params = self.get_parameters();
    let buffer = params.get_mut(param).unwrap();
    buffer.modulation.reset_ptr();
  }

  fn pop_event(&mut self) -> Option<ModuleEvent> {
    None
  }

  fn on_message(&mut self, _message: ModuleMessage) {
    panic!("module received a message when no handler is implemented");
  }
}
