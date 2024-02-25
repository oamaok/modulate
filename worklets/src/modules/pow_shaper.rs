use crate::audio_input::AudioInput;
use crate::audio_output::AudioOutput;
use crate::audio_param::{AudioParam, AudioParamModulationType};
use crate::{modulate_core::QUANTUM_SIZE, module::Module};

pub struct PowShaper {
  input: AudioInput,
  output: AudioOutput,

  exponent: AudioParam,
  gain: AudioParam,
  pre_gain: AudioParam,
}

impl Module for PowShaper {
  fn process(&mut self, _quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      let pre_gained = self.input.at(sample) * self.pre_gain.at(sample);
      self.output[sample] = f32::signum(pre_gained)
        * f32::abs(pre_gained).powf(self.exponent.at(sample))
        * self.gain.at(sample);
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![&mut self.exponent, &mut self.gain, &mut self.pre_gain]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }
}

impl PowShaper {
  pub fn new() -> Box<PowShaper> {
    Box::new(PowShaper {
      input: AudioInput::default(),
      output: AudioOutput::default(),
      exponent: AudioParam::new(AudioParamModulationType::Additive),
      gain: AudioParam::new(AudioParamModulationType::Additive),
      pre_gain: AudioParam::new(AudioParamModulationType::Additive),
    })
  }
}
