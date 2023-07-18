use super::super::modulate_core;
use super::super::module;

pub struct Oscillator {
  sync_input: modulate_core::AudioInput,
  sync_edge_detector: modulate_core::EdgeDetector,

  sin_output: modulate_core::AudioOutput,
  tri_output: modulate_core::AudioOutput,
  saw_output: modulate_core::AudioOutput,
  sqr_output: modulate_core::AudioOutput,

  cv_param: modulate_core::AudioParam,
  fm_param: modulate_core::AudioParam,
  pw_param: modulate_core::AudioParam,
  fine_param: modulate_core::AudioParam,

  phase: f32,
}

const OSCILLATOR_OVERSAMPLE: usize = 8;

impl module::Module for Oscillator {
  fn process(&mut self, quantum: u64) {
    for sample in 0..modulate_core::QUANTUM_SIZE {
      let edge = self.sync_edge_detector.step(self.sync_input.at(sample));

      if edge == modulate_core::Edge::Rose {
        self.phase = 0.5;
      }

      let cv = self.cv_param.at(sample, quantum);
      let fm = self.fm_param.at(sample, quantum);
      let pw = self.pw_param.at(sample, quantum);
      let fine = self.fine_param.at(sample, quantum);

      let voltage = 5.0 + cv + fm + fine / 12.0;
      let freq = 13.75 * f32::powf(2.0, voltage);

      self.sin_output[sample] = 0.;
      self.tri_output[sample] = 0.;
      self.saw_output[sample] = 0.;
      self.sqr_output[sample] = 0.;

      for _ in 0..OSCILLATOR_OVERSAMPLE {
        self.sin_output[sample] += self.sin() / OSCILLATOR_OVERSAMPLE as f32;
        self.tri_output[sample] += self.tri() / OSCILLATOR_OVERSAMPLE as f32;
        self.saw_output[sample] += self.saw() / OSCILLATOR_OVERSAMPLE as f32;
        self.sqr_output[sample] += self.sqr(pw) / OSCILLATOR_OVERSAMPLE as f32;

        self.phase += freq / modulate_core::SAMPLE_RATE as f32 / OSCILLATOR_OVERSAMPLE as f32;
        if self.phase > 1.0 {
          self.phase -= 1.0;
        }
      }
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut modulate_core::AudioInput> {
    vec![&mut self.sync_input]
  }

  fn get_parameters(&mut self) -> Vec<&mut modulate_core::AudioParam> {
    vec![
      &mut self.cv_param,
      &mut self.fm_param,
      &mut self.pw_param,
      &mut self.fine_param,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut modulate_core::AudioOutput> {
    vec![
      &mut self.sin_output,
      &mut self.tri_output,
      &mut self.saw_output,
      &mut self.sqr_output,
    ]
  }
}

impl Oscillator {
  pub fn new() -> Oscillator {
    Oscillator {
      sync_input: modulate_core::AudioInput::default(),
      sync_edge_detector: modulate_core::EdgeDetector::new(0.0),

      sin_output: modulate_core::AudioOutput::default(),
      tri_output: modulate_core::AudioOutput::default(),
      saw_output: modulate_core::AudioOutput::default(),
      sqr_output: modulate_core::AudioOutput::default(),

      cv_param: modulate_core::AudioParam::new(modulate_core::AudioParamModulationType::Additive),
      fm_param: modulate_core::AudioParam::new(
        modulate_core::AudioParamModulationType::Multiplicative,
      ),
      pw_param: modulate_core::AudioParam::new(modulate_core::AudioParamModulationType::Additive),
      fine_param: modulate_core::AudioParam::new(modulate_core::AudioParamModulationType::Additive),

      phase: 0.0,
    }
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
    modulate_core::exp_curve(x) * if half_x { 1. } else { -1. }
  }

  fn saw(&self) -> f32 {
    let x = self.phase + 0.5;
    modulate_core::exp_curve(x - f32::trunc(x))
  }

  fn sqr(&self, pw: f32) -> f32 {
    if self.phase > pw {
      -1.0
    } else {
      1.0
    }
  }
}
