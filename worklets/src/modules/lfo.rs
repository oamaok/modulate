use crate::audio_input::AudioInput;
use crate::audio_output::AudioOutput;
use crate::audio_param::AudioParam;
use crate::{
  edge_detector::EdgeDetector,
  modulate_core::{QUANTUM_SIZE, SAMPLE_RATE},
  module::Module,
  util::exp_curve,
};

#[derive(Default)]
pub struct LFO {
  sync_input: AudioInput,
  sync_edge_detector: EdgeDetector,

  sin_output: AudioOutput,
  tri_output: AudioOutput,
  saw_output: AudioOutput,
  sqr_output: AudioOutput,

  cv_param: AudioParam,
  pw_param: AudioParam,
  amount_param: AudioParam,
  dc_offset: AudioParam,

  phase: f32,
}

impl Module for LFO {
  fn process(&mut self, _quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      let edge = self.sync_edge_detector.step(self.sync_input.at(sample));

      if edge.rose() {
        self.phase = 0.5;
      }

      let cv = self.cv_param.at(sample);
      let pw = self.pw_param.at(sample);
      let amount = self.amount_param.at(sample);
      let dc_offset = self.dc_offset.at(sample);

      let freq = 13.75 * f32::powf(2.0, cv - 12.0);

      self.sin_output[sample] = self.sin() * amount + dc_offset;
      self.tri_output[sample] = self.tri() * amount + dc_offset;
      self.saw_output[sample] = self.saw() * amount + dc_offset;
      self.sqr_output[sample] = self.sqr(pw) * amount + dc_offset;

      self.phase += freq / SAMPLE_RATE as f32;
      if self.phase > 1.0 {
        self.phase -= 1.0;
      }
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.sync_input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.cv_param,
      &mut self.pw_param,
      &mut self.amount_param,
      &mut self.dc_offset,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![
      &mut self.sin_output,
      &mut self.tri_output,
      &mut self.saw_output,
      &mut self.sqr_output,
    ]
  }
}

impl LFO {
  pub fn new() -> Box<LFO> {
    Box::new(LFO::default())
  }

  fn sin(&self) -> f32 {
    let half_phase = self.phase < 0.5;
    let x = self.phase - if half_phase { 0.25 } else { 0.75 };
    let v = 1.0 - 16.0 * f32::powf(x, 2.);
    v * if half_phase { 1. } else { -1. }
  }

  fn tri(&self) -> f32 {
    let mut x = self.phase + 0.25;
    x -= f32::trunc(x);
    let half_x = x >= 0.5;
    x *= 2.0;
    x -= f32::trunc(x);
    exp_curve(x) * if half_x { 1. } else { -1. }
  }

  fn saw(&self) -> f32 {
    let x = self.phase + 0.5;
    exp_curve(x - f32::trunc(x))
  }

  fn sqr(&self, pw: f32) -> f32 {
    if self.phase > pw {
      -1.0
    } else {
      1.0
    }
  }
}
