use crate::audio_input::AudioInput;
use crate::audio_output::AudioOutput;
use crate::audio_param::AudioParam;
use std::f32::consts::PI;

use crate::{
  modulate_core::{QUANTUM_SIZE, SAMPLE_RATE},
  module::Module,
  util::lerp,
};

const CHORUS_BUFFER_LENGTH: usize = SAMPLE_RATE / 20;

pub struct Chorus {
  input: AudioInput,

  output_l: AudioOutput,
  output_r: AudioOutput,

  buffers: [[f32; CHORUS_BUFFER_LENGTH]; 4],

  rate: AudioParam,
  depth: AudioParam,
  stereo_phase: AudioParam,
  feedback: AudioParam,
  dry_wet: AudioParam,

  modulation: f32,
  positions: [usize; 4],
}

impl Module for Chorus {
  fn process(&mut self, _quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      let depth = self.depth.at(sample);
      let input = self.input.at(sample);
      let dry_wet = self.dry_wet.at(sample);
      {
        // Left channel
        let mut wet = 0.0;
        for i in 0..4 {
          let modulation = ((self.modulation + (i as f32) * PI / 4.0).sin() + 1.0) * depth * 100.0;
          let mod_frac = modulation.fract();
          let mod_int = modulation as usize + (CHORUS_BUFFER_LENGTH / 4) * i;

          let modulated = lerp(
            self.buffers[i][(self.positions[i] + mod_int) % CHORUS_BUFFER_LENGTH],
            self.buffers[i][(self.positions[i] + 1 + mod_int) % CHORUS_BUFFER_LENGTH],
            mod_frac,
          );
          self.buffers[i][self.positions[i]] = input + modulated * self.feedback.at(sample);
          wet += modulated;
        }

        self.output_l[sample] = lerp(input, wet, dry_wet);
      }

      {
        // Right channel
        let mut wet = 0.0;
        for i in 0..4 {
          let modulation =
            ((self.modulation + (i as f32) * PI / 4.0 + self.stereo_phase.at(sample)).sin() + 1.0)
              * depth
              * 100.0;
          let mod_frac = modulation.fract();
          let mod_int = modulation as usize + (CHORUS_BUFFER_LENGTH / 4) * i;

          let modulated = lerp(
            self.buffers[i][(self.positions[i] + mod_int) % CHORUS_BUFFER_LENGTH],
            self.buffers[i][(self.positions[i] + 1 + mod_int) % CHORUS_BUFFER_LENGTH],
            mod_frac,
          );
          self.buffers[i][self.positions[i]] = input + modulated * self.feedback.at(sample);
          wet += modulated;
        }

        self.output_r[sample] = lerp(input, wet, dry_wet);
      }

      for i in 0..4 {
        self.buffers[i][self.positions[i]] =
          input + self.buffers[i][self.positions[i]] * self.feedback.at(sample);
        self.positions[i] += 1;
        if self.positions[i] >= CHORUS_BUFFER_LENGTH {
          self.positions[i] = 0;
        }
      }
      self.modulation += self.rate.at(sample) * 0.001;
    }
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.dry_wet,
      &mut self.rate,
      &mut self.depth,
      &mut self.stereo_phase,
      &mut self.feedback,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output_l, &mut self.output_r]
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }
}

impl Chorus {
  pub fn new() -> Box<Chorus> {
    Box::new(Chorus {
      input: AudioInput::default(),

      output_l: AudioOutput::default(),
      output_r: AudioOutput::default(),

      buffers: [[0.0; CHORUS_BUFFER_LENGTH]; 4],

      rate: AudioParam::default(),
      depth: AudioParam::default(),
      stereo_phase: AudioParam::default(),
      feedback: AudioParam::default(),
      dry_wet: AudioParam::default(),

      modulation: 0.0,
      positions: [0; 4],
    })
  }
}
