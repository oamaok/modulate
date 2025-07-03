use crate::audio_input::AudioInput;
use crate::audio_output::AudioOutput;
use crate::audio_param::AudioParam;
use crate::filters::biquad_filter::BiquadFilter;
use crate::util::lerp;
use crate::{modulate_core::QUANTUM_SIZE, module::Module};

#[derive(Default)]
pub struct Distortion {
  input: AudioInput,
  output: AudioOutput,

  mix: AudioParam,
  tone: AudioParam,

  tone_filter: BiquadFilter,
  env_follower_filter: BiquadFilter,
}

impl Module for Distortion {
  fn process(&mut self, _quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      self.tone_filter.set_highpass(self.tone.at(sample), 1.0);

      let dry_input = self.input.at(sample);
      let level = self.env_follower_filter.step(dry_input.abs());
      let toned = self.tone_filter.step(dry_input);

      // Fuzz
      let fuzzed = if toned > 0.0 && toned < level * 0.5 {
        toned - level * 0.5
      } else {
        toned
      };

      let mix = self.mix.at(sample);
      self.output[sample] = lerp(dry_input, fuzzed, mix);
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.mix,
      &mut self.tone,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }
}

impl Distortion {
  pub fn new() -> Box<Distortion> {
    let mut distortion = Box::new(Distortion::default());
    distortion.env_follower_filter.set_lowpass(-6.0, 1.0);
    distortion
  }
}
