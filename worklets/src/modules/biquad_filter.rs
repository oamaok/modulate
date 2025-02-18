use crate::audio_input::AudioInput;
use crate::audio_output::AudioOutput;
use crate::audio_param::AudioParam;
use crate::filters::biquad_filter;
use crate::{modulate_core::QUANTUM_SIZE, module::Module};

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

  lowpass: biquad_filter::BiquadFilter,
  highpass: biquad_filter::BiquadFilter,
}

impl Module for BiquadFilter {
  fn process(&mut self, _quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      self
        .lowpass
        .set_lowpass(self.frequency.at(sample), self.q.at(sample));
      self
        .highpass
        .set_highpass(self.frequency.at(sample), self.q.at(sample));

      let input = self.input.at(sample);
      self.lowpass_output[sample] = self.lowpass.step(input) * self.lowpass_level.at(sample);
      self.highpass_output[sample] = self.highpass.step(input) * self.highpass_level.at(sample);
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
  pub fn new() -> Box<BiquadFilter> {
    Box::new(BiquadFilter::default())
  }
}
