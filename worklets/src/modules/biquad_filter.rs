use crate::{
  modulate_core::{AudioInput, AudioOutput, AudioParam, INV_SAMPLE_RATE, QUANTUM_SIZE},
  module::Module,
};

#[derive(Default)]
pub struct BiquadFilter {
  input: AudioInput,

  frequency: AudioParam,
  q: AudioParam,
  lowpass_level: AudioParam,
  highpass_level: AudioParam,

  freq_mod_amount: AudioParam,
  q_mod_amount: AudioParam,

  lowpass_output: AudioOutput,
  highpass_output: AudioOutput,

  input_buffer: [f32; 2],
  lowpass_buffer: [f32; 2],
  highpass_buffer: [f32; 2],
}

impl Module for BiquadFilter {
  fn process(&mut self, _quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      let voltage = 5.0 + self.frequency.at(sample);
      let freq = 13.75 * f32::powf(2.0, voltage);

      let omega = std::f32::consts::PI * 2.0 * freq * INV_SAMPLE_RATE;
      let (sin_omega, cos_omega) = f32::sin_cos(omega);
      let alpha = sin_omega / 2.0 / f32::max(f32::EPSILON, self.q.at(sample));
      let input = self.input.at(sample);

      let a0 = 1.0 + alpha;
      let a1 = -2.0 * cos_omega;
      let a2 = 1.0 - alpha;

      let rcp_a0 = 1.0 / f32::max(f32::EPSILON, a0);

      {
        let b0 = (1.0 - cos_omega) / 2.0;
        let b1 = 1.0 - cos_omega;
        let b2 = b0;

        let output = ((b0 * rcp_a0) * input
          + (b1 * rcp_a0) * self.input_buffer[0]
          + (b2 * rcp_a0) * self.input_buffer[1]
          - (a1 * rcp_a0) * self.lowpass_buffer[0]
          - (a2 * rcp_a0) * self.lowpass_buffer[1])
          .clamp(-1000., 1000.);

        self.lowpass_buffer[1] = self.lowpass_buffer[0];
        self.lowpass_buffer[0] = output;
        self.lowpass_output[sample] = output * self.lowpass_level.at(sample);
      }

      {
        let b0 = (1.0 + cos_omega) / 2.0;
        let b1 = -(1.0 + cos_omega);
        let b2 = b0;

        let output = ((b0 * rcp_a0) * input
          + (b1 * rcp_a0) * self.input_buffer[0]
          + (b2 * rcp_a0) * self.input_buffer[1]
          - (a1 * rcp_a0) * self.highpass_buffer[0]
          - (a2 * rcp_a0) * self.highpass_buffer[1])
          .clamp(-1000., 1000.);

        self.highpass_buffer[1] = self.highpass_buffer[0];
        self.highpass_buffer[0] = output;
        self.highpass_output[sample] = output * self.highpass_level.at(sample);
      }

      self.input_buffer[1] = self.input_buffer[0];
      self.input_buffer[0] = input;
    }
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.frequency,
      &mut self.q,
      &mut self.lowpass_level,
      &mut self.highpass_level,
      &mut self.freq_mod_amount,
      &mut self.q_mod_amount,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.lowpass_output, &mut self.highpass_output]
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }
}

impl BiquadFilter {
  pub fn new() -> BiquadFilter {
    BiquadFilter::default()
  }
}
