use crate::modulate_core::{INV_SAMPLE_RATE, SAMPLE_RATE_F32};

#[derive(Default)]
pub struct BiquadFilter {
  a0: f32,
  a1: f32,
  a2: f32,

  b0: f32,
  b1: f32,
  b2: f32,

  input_buffer: [f32; 2],
  feedback_buffer: [f32; 2],
}

fn voltage_to_freq(voltage: f32) -> f32 {
  f32::min(13.75 * f32::powf(2.0, voltage + 5.0), SAMPLE_RATE_F32 / 2.0)
}

fn get_q_params(freq: f32, q: f32) -> (f32, f32) {
  let omega = 2.0 * std::f32::consts::PI * freq * INV_SAMPLE_RATE;
  let (sin_omega, cos_omega) = f32::sin_cos(omega);
  let alpha = sin_omega / 2.0 / q.max(f32::EPSILON);

  (alpha, cos_omega)
}

fn get_slope_params(freq: f32, db_gain: f32, slope: f32) -> (f32, f32, f32) {
  let amp = 10.0f32.powf(db_gain / 30.0);
  let omega = std::f32::consts::PI * 2.0 * freq * INV_SAMPLE_RATE;
  let (sin_omega, cos_omega) = f32::sin_cos(omega);
  let alpha = sin_omega / 2.0
    * f32::sqrt(f32::max(
      f32::EPSILON,
      (amp + 1.0 / amp) * (1.0 / f32::max(f32::EPSILON, slope) - 1.0) + 2.0,
    ));

  assert!(!alpha.is_nan());
  assert!(!alpha.is_infinite());

  (alpha, cos_omega, amp)
}

impl BiquadFilter {
  pub fn new() -> Self {
    BiquadFilter {
      a0: 0.0,
      a1: 0.0,
      a2: 0.0,

      b0: 0.0,
      b1: 0.0,
      b2: 0.0,

      input_buffer: [0.0; 2],
      feedback_buffer: [0.0; 2],
    }
  }

  pub fn set_lowpass(&mut self, cutoff_voltage: f32, q_voltage: f32) {
    let freq = voltage_to_freq(cutoff_voltage);
    let (alpha, cos_omega) = get_q_params(freq, q_voltage);

    self.b0 = (1.0 - cos_omega) / 2.0;
    self.b1 = 1.0 - cos_omega;
    self.b2 = self.b0;

    self.a0 = 1.0 + alpha;
    self.a1 = -2.0 * cos_omega;
    self.a2 = 1.0 - alpha;
  }

  pub fn set_highpass(&mut self, cutoff_voltage: f32, q_voltage: f32) {
    let freq = voltage_to_freq(cutoff_voltage);
    let (alpha, cos_omega) = get_q_params(freq, q_voltage);

    self.b0 = (1.0 + cos_omega) / 2.0;
    self.b1 = -(1.0 + cos_omega);
    self.b2 = self.b0;

    self.a0 = 1.0 + alpha;
    self.a1 = -2.0 * cos_omega;
    self.a2 = 1.0 - alpha;
  }

  pub fn set_bandpass(&mut self, cutoff_voltage: f32, q_voltage: f32) {
    let freq = voltage_to_freq(cutoff_voltage);
    let (alpha, cos_omega) = get_q_params(freq, q_voltage);

    self.b0 = alpha * q_voltage;
    self.b1 = 0.0;
    self.b2 = self.b0;

    self.a0 = 1.0 + alpha;
    self.a1 = -2.0 * cos_omega;
    self.a2 = 1.0 - alpha;
  }

  pub fn set_notch(&mut self, cutoff_voltage: f32, q_voltage: f32) {
    let freq = voltage_to_freq(cutoff_voltage);
    let (alpha, cos_omega) = get_q_params(freq, q_voltage);

    self.b0 = 1.0;
    self.b1 = -2.0 * cos_omega;
    self.b2 = 1.0;

    self.a0 = 1.0 + alpha;
    self.a1 = -2.0 * cos_omega;
    self.a2 = 1.0 - alpha;
  }

  pub fn set_peaking(&mut self, cutoff_voltage: f32, slope_voltage: f32, gain_voltage: f32) {
    let freq = voltage_to_freq(cutoff_voltage);
    let (alpha, cos_omega, amp) = get_slope_params(freq, gain_voltage, slope_voltage);

    self.b0 = 1.0 + alpha * amp;
    self.b1 = -2.0 * cos_omega;
    self.b2 = 1.0 - alpha * amp;

    self.a0 = 1.0 + alpha / amp;
    self.a1 = -2.0 * cos_omega;
    self.a2 = 1.0 - alpha / amp;
  }

  pub fn set_lowshelf(&mut self, cutoff_voltage: f32, slope_voltage: f32, gain_voltage: f32) {
    let freq = voltage_to_freq(cutoff_voltage);
    let (alpha, cos_omega, amp) = get_slope_params(freq, gain_voltage, slope_voltage);

    let sqrt_amp = amp.sqrt();

    let amp_inc = amp + 1.0;
    let amp_dec = amp - 1.0;
    let double_sqrt_amp_alpha = 2.0 * sqrt_amp * alpha;

    self.b0 = amp * (amp_inc - amp_dec * cos_omega + double_sqrt_amp_alpha);
    self.b1 = 2.0 * amp * (amp_dec - amp_inc * cos_omega);
    self.b2 = amp * (amp_inc - amp_dec * cos_omega - double_sqrt_amp_alpha);

    self.a0 = amp_inc + amp_dec * cos_omega + double_sqrt_amp_alpha;
    self.a1 = -2.0 * (amp_dec + amp_inc * cos_omega);
    self.a2 = amp_inc + amp_dec * cos_omega - double_sqrt_amp_alpha;
  }

  pub fn set_highshelf(&mut self, cutoff_voltage: f32, slope_voltage: f32, gain_voltage: f32) {
    let freq = voltage_to_freq(cutoff_voltage);
    let (alpha, cos_omega, amp) = get_slope_params(freq, gain_voltage, slope_voltage);
    let sqrt_amp = amp.sqrt();

    let amp_inc = amp + 1.0;
    let amp_dec = amp - 1.0;
    let double_sqrt_amp_alpha = 2.0 * sqrt_amp * alpha;

    self.b0 = amp * (amp_inc + amp_dec * cos_omega + double_sqrt_amp_alpha);
    self.b1 = -2.0 * amp * (amp_dec + amp_inc * cos_omega);
    self.b2 = amp * (amp_inc + amp_dec * cos_omega - double_sqrt_amp_alpha);

    self.a0 = amp_inc - amp_dec * cos_omega + double_sqrt_amp_alpha;
    self.a1 = 2.0 * (amp_dec - amp_inc * cos_omega);
    self.a2 = amp_inc - amp_dec * cos_omega - double_sqrt_amp_alpha;
  }

  pub fn get_coefficients(&self) -> Vec<f32> {
    vec![self.a0, self.a1, self.a2, self.b0, self.b1, self.b2]
  }

  pub fn step(&mut self, input: f32) -> f32 {
    let rcp_a0 = 1.0 / f32::max(f32::EPSILON, self.a0);

    let output = rcp_a0
      * (self.b0 * input + self.b1 * self.input_buffer[0] + self.b2 * self.input_buffer[1]
        - self.a1 * self.feedback_buffer[0]
        - self.a2 * self.feedback_buffer[1]);

    self.feedback_buffer[1] = self.feedback_buffer[0];
    self.feedback_buffer[0] = output;

    self.input_buffer[1] = self.input_buffer[0];
    self.input_buffer[0] = input;

    output
  }
}
