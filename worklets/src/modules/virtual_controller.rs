use crate::{
  modulate_core::{AudioOutput, AudioParam, QUANTUM_SIZE},
  module::{Module, ModuleEvent},
};

const NUM_PADS: usize = 4;

pub struct VirtualController {
  pressed_keys: [(f32, f32); 2],
  pads: [f32; NUM_PADS],

  knob_a_param: AudioParam,
  knob_b_param: AudioParam,
  knob_c_param: AudioParam,
  knob_d_param: AudioParam,

  keyboard_first_cv_output: AudioOutput,
  keyboard_first_gate_output: AudioOutput,
  keyboard_second_cv_output: AudioOutput,
  keyboard_second_gate_output: AudioOutput,

  pad_a_output: AudioOutput,
  pad_b_output: AudioOutput,
  pad_c_output: AudioOutput,
  pad_d_output: AudioOutput,

  knob_a_output: AudioOutput,
  knob_b_output: AudioOutput,
  knob_c_output: AudioOutput,
  knob_d_output: AudioOutput,

  events: Vec<ModuleEvent>,
}

impl Module for VirtualController {
  fn process(&mut self, quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      self.pad_a_output[sample] = self.pads[0];
      self.pad_b_output[sample] = self.pads[1];
      self.pad_c_output[sample] = self.pads[2];
      self.pad_d_output[sample] = self.pads[3];

      self.keyboard_first_cv_output[sample] = (self.pressed_keys[0].0 as f32 - 9.0) / 12.0;
      self.keyboard_first_gate_output[sample] = self.pressed_keys[0].1;

      self.keyboard_second_cv_output[sample] = (self.pressed_keys[1].0 as f32 - 9.0) / 12.0;
      self.keyboard_second_gate_output[sample] = self.pressed_keys[1].1;

      self.knob_a_output[sample] = self.knob_a_param.at(sample, quantum);
      self.knob_b_output[sample] = self.knob_b_param.at(sample, quantum);
      self.knob_c_output[sample] = self.knob_c_param.at(sample, quantum);
      self.knob_d_output[sample] = self.knob_d_param.at(sample, quantum);
    }
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.knob_a_param,
      &mut self.knob_b_param,
      &mut self.knob_c_param,
      &mut self.knob_d_param,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![
      &mut self.keyboard_first_cv_output,
      &mut self.keyboard_first_gate_output,
      &mut self.keyboard_second_cv_output,
      &mut self.keyboard_second_gate_output,
      &mut self.pad_a_output,
      &mut self.pad_b_output,
      &mut self.pad_c_output,
      &mut self.pad_d_output,
      &mut self.knob_a_output,
      &mut self.knob_b_output,
      &mut self.knob_c_output,
      &mut self.knob_d_output,
    ]
  }

  fn pop_event(&mut self) -> Option<ModuleEvent> {
    self.events.pop()
  }
}

impl VirtualController {
  pub fn init(&mut self) {
    self.events.push({
      ModuleEvent::VirtualControllerPointers {
        pressed_keys: self.pressed_keys.as_ptr() as usize,
        pads: self.pads.as_ptr() as usize,
      }
    });
  }

  pub fn new() -> VirtualController {
    VirtualController {
      pressed_keys: [(0.0, 0.0); 2],
      pads: [0.0; NUM_PADS],
      knob_a_param: AudioParam::default(),
      knob_b_param: AudioParam::default(),
      knob_c_param: AudioParam::default(),
      knob_d_param: AudioParam::default(),
      keyboard_first_cv_output: AudioOutput::default(),
      keyboard_first_gate_output: AudioOutput::default(),
      keyboard_second_cv_output: AudioOutput::default(),
      keyboard_second_gate_output: AudioOutput::default(),
      pad_a_output: AudioOutput::default(),
      pad_b_output: AudioOutput::default(),
      pad_c_output: AudioOutput::default(),
      pad_d_output: AudioOutput::default(),
      knob_a_output: AudioOutput::default(),
      knob_b_output: AudioOutput::default(),
      knob_c_output: AudioOutput::default(),
      knob_d_output: AudioOutput::default(),
      events: vec![],
    }
  }
}
