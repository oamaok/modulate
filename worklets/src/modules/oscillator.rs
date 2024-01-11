use crate::{
  modulate_core::{
    exp_curve, AudioInput, AudioOutput, AudioParam, AudioParamModulationType, Edge, EdgeDetector,
    QUANTUM_SIZE, SAMPLE_RATE,
  },
  module::Module,
};

pub struct Oscillator {
  sync_input: AudioInput,
  sync_edge_detector: EdgeDetector,

  sin_output: AudioOutput,
  tri_output: AudioOutput,
  saw_output: AudioOutput,
  sqr_output: AudioOutput,

  cv_param: AudioParam,
  fm_param: AudioParam,
  pw_param: AudioParam,
  fine_param: AudioParam,
  level: AudioParam,

  phase: f32,
}

const OSCILLATOR_OVERSAMPLE: usize = 32;

impl Module for Oscillator {
  fn process(&mut self, _quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      let edge = self.sync_edge_detector.step(self.sync_input.at(sample));

      if edge == Edge::Rose {
        self.phase = 0.5;
      }

      let cv = self.cv_param.at(sample);
      let fm = self.fm_param.at(sample);
      let pw = self.pw_param.at(sample);
      let fine = self.fine_param.at(sample);

      let voltage = 5.0 + cv + fm + fine / 12.0;
      let freq = 13.75 * f32::powf(2.0, voltage);

      self.sin_output[sample] = 0.;
      self.tri_output[sample] = 0.;
      self.saw_output[sample] = 0.;
      self.sqr_output[sample] = 0.;

      let level_factor = self.level.at(sample) / OSCILLATOR_OVERSAMPLE as f32;

      for _ in 0..OSCILLATOR_OVERSAMPLE {
        self.sin_output[sample] += self.sin() * level_factor;
        self.tri_output[sample] += self.tri() * level_factor;
        self.saw_output[sample] += self.saw() * level_factor;
        self.sqr_output[sample] += self.sqr(pw) * level_factor;

        self.phase += freq / SAMPLE_RATE as f32 / OSCILLATOR_OVERSAMPLE as f32;
        if self.phase > 1.0 {
          self.phase -= 1.0;
        }
      }
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.sync_input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.cv_param,
      &mut self.fm_param,
      &mut self.pw_param,
      &mut self.fine_param,
      &mut self.level,
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

impl Oscillator {
  pub fn new() -> Box<Oscillator> {
    Box::new(Oscillator {
      sync_input: AudioInput::default(),
      sync_edge_detector: EdgeDetector::new(0.0),

      sin_output: AudioOutput::default(),
      tri_output: AudioOutput::default(),
      saw_output: AudioOutput::default(),
      sqr_output: AudioOutput::default(),

      cv_param: AudioParam::new(AudioParamModulationType::Additive),
      fm_param: AudioParam::new(AudioParamModulationType::Multiplicative),
      pw_param: AudioParam::new(AudioParamModulationType::Additive),
      fine_param: AudioParam::new(AudioParamModulationType::Additive),
      level: AudioParam::new(AudioParamModulationType::Additive),

      phase: 0.0,
    })
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
