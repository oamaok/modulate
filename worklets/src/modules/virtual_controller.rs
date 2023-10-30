use super::super::modulate_core;
use super::super::module;
use std::cmp::Ordering;

const OCTAVES: usize = 4;
const NUM_KEYS: usize = 12 * OCTAVES;
const NUM_PADS: usize = 4;

pub struct VirtualController {
  pressed_keys: [(f32, f32); 2],
  pads: [f32; NUM_PADS],

  knob_a_param: modulate_core::AudioParam,
  knob_b_param: modulate_core::AudioParam,
  knob_c_param: modulate_core::AudioParam,
  knob_d_param: modulate_core::AudioParam,

  keyboard_first_cv_output: modulate_core::AudioOutput,
  keyboard_first_gate_output: modulate_core::AudioOutput,
  keyboard_second_cv_output: modulate_core::AudioOutput,
  keyboard_second_gate_output: modulate_core::AudioOutput,

  pad_a_output: modulate_core::AudioOutput,
  pad_b_output: modulate_core::AudioOutput,
  pad_c_output: modulate_core::AudioOutput,
  pad_d_output: modulate_core::AudioOutput,

  knob_a_output: modulate_core::AudioOutput,
  knob_b_output: modulate_core::AudioOutput,
  knob_c_output: modulate_core::AudioOutput,
  knob_d_output: modulate_core::AudioOutput,

  events: Vec<module::ModuleEvent>,
}

impl module::Module for VirtualController {
  fn process(&mut self, quantum: u64) {
    for sample in 0..modulate_core::QUANTUM_SIZE {
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

  fn get_parameters(&mut self) -> Vec<&mut modulate_core::AudioParam> {
    vec![
      &mut self.knob_a_param,
      &mut self.knob_b_param,
      &mut self.knob_c_param,
      &mut self.knob_d_param,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut modulate_core::AudioOutput> {
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

  fn pop_event(&mut self) -> Option<module::ModuleEvent> {
    self.events.pop()
  }
}

impl VirtualController {
  pub fn init(&mut self) {
    self.events.push({
      module::ModuleEvent::VirtualControllerPointers {
        pressed_keys: self.pressed_keys.as_ptr() as usize,
        pads: self.pads.as_ptr() as usize,
      }
    });
  }

  pub fn new() -> VirtualController {
    VirtualController {
      pressed_keys: [(0.0, 0.0); 2],
      pads: [0.0; NUM_PADS],
      knob_a_param: modulate_core::AudioParam::default(),
      knob_b_param: modulate_core::AudioParam::default(),
      knob_c_param: modulate_core::AudioParam::default(),
      knob_d_param: modulate_core::AudioParam::default(),
      keyboard_first_cv_output: modulate_core::AudioOutput::default(),
      keyboard_first_gate_output: modulate_core::AudioOutput::default(),
      keyboard_second_cv_output: modulate_core::AudioOutput::default(),
      keyboard_second_gate_output: modulate_core::AudioOutput::default(),
      pad_a_output: modulate_core::AudioOutput::default(),
      pad_b_output: modulate_core::AudioOutput::default(),
      pad_c_output: modulate_core::AudioOutput::default(),
      pad_d_output: modulate_core::AudioOutput::default(),
      knob_a_output: modulate_core::AudioOutput::default(),
      knob_b_output: modulate_core::AudioOutput::default(),
      knob_c_output: modulate_core::AudioOutput::default(),
      knob_d_output: modulate_core::AudioOutput::default(),
      events: vec![],
    }
  }
}
