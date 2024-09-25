use crate::audio_input::AudioInput;
use crate::audio_output::AudioOutput;
use crate::audio_param::{AudioParam, AudioParamModulationType};
use crate::{modulate_core::QUANTUM_SIZE, module::Module};

pub struct RingMod {
  input_a: AudioInput,
  input_b: AudioInput,

  gain: AudioParam,

  output: AudioOutput,
}

impl Module for RingMod {
  fn process(&mut self, _quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      self.output[sample] =
        self.input_a.at(sample) * self.input_b.at(sample) * self.gain.at(sample);
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input_a, &mut self.input_b]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![&mut self.gain]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }
}

impl RingMod {
  pub fn new() -> Box<RingMod> {
    Box::new(RingMod {
      input_a: AudioInput::default(),
      input_b: AudioInput::default(),
      gain: AudioParam::new(AudioParamModulationType::Additive),
      output: AudioOutput::default(),
    })
  }
}
