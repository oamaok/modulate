use crate::{
  modulate_core::{
    AllPassFilter, AudioInput, AudioOutput, AudioParam, FeedbackCombFilter, QUANTUM_SIZE,
    SAMPLE_RATE,
  },
  module::Module,
};

const COMB_GAIN_COUNT: usize = 4;
const COMB_GAIN_OFFSETS: [f32; COMB_GAIN_COUNT] = [0.0, -0.01313, -0.02743, -0.031];
const COMB_DELAY_OFFSETS: [f32; COMB_GAIN_COUNT] = [0.0, -0.011, 0.019, -0.008];

pub struct Reverb {
  input: AudioInput,
  output: AudioOutput,

  delay: AudioParam,
  decay: AudioParam,
  diffuse: AudioParam,
  wet: AudioParam,
  dry: AudioParam,

  comb_filters: Vec<FeedbackCombFilter>,
  all_pass_filters: Vec<AllPassFilter>,
}

impl Module for Reverb {
  fn process(&mut self, _quantum: u64) {
    for i in 0..COMB_GAIN_COUNT {
      let delay = ((self.delay.at(0) + COMB_DELAY_OFFSETS[i]) * SAMPLE_RATE as f32) as usize;
      self.comb_filters[i].set_delay(delay);
    }

    for sample in 0..QUANTUM_SIZE {
      let input = self.input.at(sample);
      let mut output = 0.0;

      for i in 0..COMB_GAIN_COUNT {
        let filter = &mut self.comb_filters[i];
        filter.gain = self.decay.at(sample) + COMB_GAIN_OFFSETS[i];
        output += filter.step(input);
      }

      for filter in self.all_pass_filters.iter_mut() {
        filter.gain = self.diffuse.at(sample);
        output = filter.step(output);
      }

      self.output[sample] = output * self.wet.at(sample) + input * self.dry.at(sample);
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.delay,
      &mut self.decay,
      &mut self.diffuse,
      &mut self.wet,
      &mut self.dry,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }
}

impl Reverb {
  pub fn new() -> Box<Reverb> {
    Box::new(Reverb {
      input: AudioInput::default(),
      output: AudioOutput::default(),

      delay: AudioParam::default(),
      decay: AudioParam::default(),
      diffuse: AudioParam::default(),
      wet: AudioParam::default(),
      dry: AudioParam::default(),

      comb_filters: vec![
        FeedbackCombFilter::new(1000, 0.1),
        FeedbackCombFilter::new(1000, 0.1),
        FeedbackCombFilter::new(1000, 0.1),
        FeedbackCombFilter::new(1000, 0.1),
      ],

      all_pass_filters: vec![
        AllPassFilter::new(1051, 0.7),
        AllPassFilter::new(337, 0.7),
        AllPassFilter::new(113, 0.7),
      ],
    })
  }
}
