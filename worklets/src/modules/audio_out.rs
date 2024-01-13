use crate::{
  modulate_core::{AudioInput, AudioOutput, AudioParam, AudioParamModulationType, QUANTUM_SIZE},
  module::Module,
};

pub struct AudioOut {
  input_l: AudioInput,
  input_r: AudioInput,

  output_l: AudioOutput,
  output_r: AudioOutput,

  volume: AudioParam,
}

impl Module for AudioOut {
  fn process(&mut self, _quantum: u64) {
    let is_mono = !self.input_r.is_connected();

    if is_mono {
      for sample in 0..QUANTUM_SIZE {
        self.output_l[sample] = self.input_l.at(sample) * self.volume.at(sample);
        self.output_r[sample] = self.input_l.at(sample) * self.volume.at(sample);
      }
    } else {
      for sample in 0..QUANTUM_SIZE {
        self.output_l[sample] = self.input_l.at(sample) * self.volume.at(sample);
        self.output_r[sample] = self.input_r.at(sample) * self.volume.at(sample);
      }
    }
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![&mut self.volume]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output_l, &mut self.output_r]
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input_l, &mut self.input_r]
  }
}

impl AudioOut {
  pub fn new() -> Box<AudioOut> {
    Box::new(AudioOut {
      input_l: AudioInput::default(),
      input_r: AudioInput::default(),
      output_l: AudioOutput::default(),
      output_r: AudioOutput::default(),
      volume: AudioParam::new(AudioParamModulationType::Additive),
    })
  }
}
