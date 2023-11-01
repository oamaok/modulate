use super::super::modulate_core;
use super::super::module;

#[derive(Default)]
pub struct BiquadFilter {
  input: modulate_core::AudioInput,

  frequency: modulate_core::AudioParam,
  q: modulate_core::AudioParam,
  lowpass_level: modulate_core::AudioParam,
  highpass_level: modulate_core::AudioParam,

  freq_mod_amount: modulate_core::AudioParam,
  q_mod_amount: modulate_core::AudioParam,

  lowpass_output: modulate_core::AudioOutput,
  highpass_output: modulate_core::AudioOutput,

  input_buffer: [f32; 2],
  lowpass_buffer: [f32; 2],
  highpass_buffer: [f32; 2],
}

impl module::Module for BiquadFilter {
  fn process(&mut self, quantum: u64) {
    for sample in 0..modulate_core::QUANTUM_SIZE {
      let voltage = 5.0
        + self
          .frequency
          .at_mod_amt(sample, quantum, self.freq_mod_amount.at(sample, quantum));
      let freq = 13.75 * f32::powf(2.0, voltage);

      let omega = std::f32::consts::PI * 2.0 * freq * modulate_core::INV_SAMPLE_RATE;
      let (sin_omega, cos_omega) = f32::sin_cos(omega);
      let alpha = sin_omega
        / 2.0
        / f32::max(
          f32::EPSILON,
          self
            .q
            .at_mod_amt(sample, quantum, self.q_mod_amount.at(sample, quantum)),
        );
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
        self.lowpass_output[sample] = output * self.lowpass_level.at(sample, quantum);
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
        self.highpass_output[sample] = output * self.highpass_level.at(sample, quantum);
      }

      self.input_buffer[1] = self.input_buffer[0];
      self.input_buffer[0] = input;
    }
  }

  fn get_parameters(&mut self) -> Vec<&mut modulate_core::AudioParam> {
    vec![
      &mut self.frequency,
      &mut self.q,
      &mut self.lowpass_level,
      &mut self.highpass_level,
      &mut self.freq_mod_amount,
      &mut self.q_mod_amount,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut modulate_core::AudioOutput> {
    vec![&mut self.lowpass_output, &mut self.highpass_output]
  }

  fn get_inputs(&mut self) -> Vec<&mut modulate_core::AudioInput> {
    vec![&mut self.input]
  }
}

impl BiquadFilter {
  pub fn new() -> BiquadFilter {
    BiquadFilter::default()
  }
}
