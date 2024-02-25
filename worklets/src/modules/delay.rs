use crate::audio_input::AudioInput;
use crate::audio_output::AudioOutput;
use crate::audio_param::AudioParam;
use crate::{
  delay_line::VariableDelayLineInterpolated,
  modulate_core::{QUANTUM_SIZE, SAMPLE_RATE, SAMPLE_RATE_F32},
  module::Module,
};

pub struct Delay {
  input: AudioInput,
  output: AudioOutput,

  time: AudioParam,
  feedback: AudioParam,
  wet: AudioParam,
  dry: AudioParam,

  delay: VariableDelayLineInterpolated,
}

impl Module for Delay {
  fn process(&mut self, _quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      self.delay.set_delay(self.time.at(sample) * SAMPLE_RATE_F32);

      let input = self.input.at(sample);
      let wet = self.delay.read_sinc();
      self.delay.write(input + wet * self.feedback.at(sample));
      self.output[sample] = wet * self.wet.at(sample) + input * self.dry.at(sample);
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.time,
      &mut self.feedback,
      &mut self.wet,
      &mut self.dry,
    ]
  }
}

impl Delay {
  pub fn new() -> Box<Delay> {
    Box::new(Delay {
      input: AudioInput::default(),
      output: AudioOutput::default(),

      time: AudioParam::default(),
      feedback: AudioParam::default(),
      wet: AudioParam::default(),
      dry: AudioParam::default(),

      delay: VariableDelayLineInterpolated::new(SAMPLE_RATE * 10, 10000.0),
    })
  }
}
