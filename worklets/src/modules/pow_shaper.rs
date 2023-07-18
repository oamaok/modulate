use super::super::modulate_core;
use super::super::module;

pub struct PowShaper {
  input: modulate_core::AudioInput,
  output: modulate_core::AudioOutput,

  exponent: modulate_core::AudioParam,
  gain: modulate_core::AudioParam,
  pre_gain: modulate_core::AudioParam,
}

impl module::Module for PowShaper {
  fn process(&mut self, quantum: u64) {
    for sample in 0..modulate_core::QUANTUM_SIZE {
      let pre_gained = self.input.at(sample) * self.pre_gain.at(sample, quantum);
      self.output[sample] = f32::signum(pre_gained)
        * f32::abs(pre_gained).powf(self.exponent.at(sample, quantum))
        * self.gain.at(sample, quantum);
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut modulate_core::AudioInput> {
    vec![&mut self.input]
  }

  fn get_parameters(&mut self) -> Vec<&mut modulate_core::AudioParam> {
    vec![&mut self.exponent, &mut self.gain, &mut self.pre_gain]
  }

  fn get_outputs(&mut self) -> Vec<&mut modulate_core::AudioOutput> {
    vec![&mut self.output]
  }
}

impl PowShaper {
  pub fn new() -> PowShaper {
    PowShaper {
      input: modulate_core::AudioInput::default(),
      output: modulate_core::AudioOutput::default(),
      exponent: modulate_core::AudioParam::new(modulate_core::AudioParamModulationType::Additive),
      gain: modulate_core::AudioParam::new(modulate_core::AudioParamModulationType::Additive),
      pre_gain: modulate_core::AudioParam::new(modulate_core::AudioParamModulationType::Additive),
    }
  }
}
