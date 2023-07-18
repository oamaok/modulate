use super::super::modulate_core;
use super::super::module;

const COMB_GAIN_COUNT: usize = 4;
const COMB_GAIN_OFFSETS: [f32; COMB_GAIN_COUNT] = [0.0, -0.01313, -0.02743, -0.031];
const COMB_DELAY_OFFSETS: [f32; COMB_GAIN_COUNT] = [0.0, -0.011, 0.019, -0.008];

pub struct Reverb {
  input: modulate_core::AudioInput,
  output: modulate_core::AudioOutput,

  delay: modulate_core::AudioParam,
  decay: modulate_core::AudioParam,
  diffuse: modulate_core::AudioParam,
  wet: modulate_core::AudioParam,
  dry: modulate_core::AudioParam,

  comb_filters: Vec<modulate_core::FeedbackCombFilter>,
  all_pass_filters: Vec<modulate_core::AllPassFilter>,
}

impl module::Module for Reverb {
  fn process(&mut self, quantum: u64) {
    for i in 0..COMB_GAIN_COUNT {
      let delay = ((self.delay.at(0, quantum) + COMB_DELAY_OFFSETS[i])
        * modulate_core::SAMPLE_RATE as f32) as usize;
      self.comb_filters[i].set_delay(delay);
    }

    for sample in 0..modulate_core::QUANTUM_SIZE {
      let input = self.input.at(sample);
      let mut output = 0.0;

      for i in 0..COMB_GAIN_COUNT {
        let filter = &mut self.comb_filters[i];
        filter.gain = self.decay.at(sample, quantum) + COMB_GAIN_OFFSETS[i];
        output += filter.step(input);
      }

      for filter in self.all_pass_filters.iter_mut() {
        filter.gain = self.diffuse.at(sample, quantum);
        output = filter.step(output);
      }

      self.output[sample] =
        output * self.wet.at(sample, quantum) + input * self.dry.at(sample, quantum);
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut modulate_core::AudioInput> {
    vec![&mut self.input]
  }

  fn get_parameters(&mut self) -> Vec<&mut modulate_core::AudioParam> {
    vec![
      &mut self.delay,
      &mut self.decay,
      &mut self.diffuse,
      &mut self.wet,
      &mut self.dry,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut modulate_core::AudioOutput> {
    vec![&mut self.output]
  }
}

impl Reverb {
  pub fn new() -> Reverb {
    Reverb {
      input: modulate_core::AudioInput::default(),
      output: modulate_core::AudioOutput::default(),

      delay: modulate_core::AudioParam::default(),
      decay: modulate_core::AudioParam::default(),
      diffuse: modulate_core::AudioParam::default(),
      wet: modulate_core::AudioParam::default(),
      dry: modulate_core::AudioParam::default(),

      comb_filters: vec![
        modulate_core::FeedbackCombFilter::new(1000, 0.1),
        modulate_core::FeedbackCombFilter::new(1000, 0.1),
        modulate_core::FeedbackCombFilter::new(1000, 0.1),
        modulate_core::FeedbackCombFilter::new(1000, 0.1),
      ],

      all_pass_filters: vec![
        modulate_core::AllPassFilter::new(1051, 0.7),
        modulate_core::AllPassFilter::new(337, 0.7),
        modulate_core::AllPassFilter::new(113, 0.7),
      ],
    }
  }
}
