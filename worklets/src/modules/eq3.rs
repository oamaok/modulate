use crate::audio_input::AudioInput;
use crate::audio_output::AudioOutput;
use crate::audio_param::AudioParam;
use crate::filters::biquad_filter::BiquadFilter;
use crate::{modulate_core::QUANTUM_SIZE, module::Module};

pub struct EQ3 {
  input: AudioInput,
  output: AudioOutput,

  lowshelf_freq: AudioParam,
  lowshelf_gain: AudioParam,
  lowshelf_slope: AudioParam,

  highshelf_freq: AudioParam,
  highshelf_gain: AudioParam,
  highshelf_slope: AudioParam,

  peaking_freq: AudioParam,
  peaking_gain: AudioParam,
  peaking_slope: AudioParam,

  lowself: BiquadFilter,
  highself: BiquadFilter,
  peaking: BiquadFilter,
}

impl Module for EQ3 {
  fn process(&mut self, _quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      self.lowself.set_lowshelf(
        self.lowshelf_freq.at(sample),
        self.lowshelf_slope.at(sample),
        self.lowshelf_gain.at(sample),
      );
      self.highself.set_highshelf(
        self.highshelf_freq.at(sample),
        self.highshelf_slope.at(sample),
        self.highshelf_gain.at(sample),
      );
      self.peaking.set_peaking(
        self.peaking_freq.at(sample),
        self.peaking_slope.at(sample),
        self.peaking_gain.at(sample),
      );

      let mut output = self.input.at(sample);
      output = self.lowself.step(output);
      output = self.peaking.step(output);
      output = self.highself.step(output);

      self.output[sample] = output;
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.lowshelf_freq,
      &mut self.lowshelf_slope,
      &mut self.lowshelf_gain,
      &mut self.highshelf_freq,
      &mut self.highshelf_slope,
      &mut self.highshelf_gain,
      &mut self.peaking_freq,
      &mut self.peaking_slope,
      &mut self.peaking_gain,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }
}

impl EQ3 {
  pub fn new() -> Box<EQ3> {
    Box::new(EQ3 {
      input: AudioInput::default(),
      output: AudioOutput::default(),

      lowshelf_freq: AudioParam::default(),
      lowshelf_gain: AudioParam::default(),
      lowshelf_slope: AudioParam::default(),

      highshelf_freq: AudioParam::default(),
      highshelf_gain: AudioParam::default(),
      highshelf_slope: AudioParam::default(),

      peaking_freq: AudioParam::default(),
      peaking_gain: AudioParam::default(),
      peaking_slope: AudioParam::default(),

      lowself: BiquadFilter::default(),
      highself: BiquadFilter::default(),
      peaking: BiquadFilter::default(),
    })
  }
}
