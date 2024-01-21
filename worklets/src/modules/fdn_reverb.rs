use std::arch::wasm32::{f32x4, f32x4_add, f32x4_mul, f32x4_splat, f32x4_sub, v128, v128_store};

use crate::{
  modulate_core::{
    AudioInput, AudioOutput, AudioParam, VariableDelayLineInterpolated, QUANTUM_SIZE, SAMPLE_RATE,
  },
  module::Module,
};

pub struct FDNReverb {
  input: AudioInput,
  output: AudioOutput,
  dry_wet: AudioParam,
  mod_amount: AudioParam,
  mod_speed: AudioParam,
  decay: AudioParam,
  size: AudioParam,

  delays: [VariableDelayLineInterpolated; 8],

  modulation: f32,
}

const PRIMES: [f32; 8] = [
  1013.0, 1019.0, 1021.0, 1031.0, 1033.0, 1039.0, 1049.0, 1051.0,
];

type Vec8 = [f32; 8];

impl Module for FDNReverb {
  fn process(&mut self, _quantum: u64) {
    // 4th order Hadamard matrix by column
    // Reference: https://www.dsprelated.com/freebooks/pasp/FDN_Reverberation.html
    let hadamard = [
      f32x4(1.0, -1.0, -1.0, 1.0),
      f32x4(1.0, 1.0, -1.0, -1.0),
      f32x4(1.0, -1.0, 1.0, -1.0),
      f32x4(1.0, 1.0, 1.0, 1.0),
    ];

    for sample in 0..QUANTUM_SIZE {
      let input = self.input.at(sample);
      let mod_amount = self.mod_amount.at(sample);
      let mod_speed = self.mod_speed.at(sample);
      let decay = self.decay.at(sample);

      let vec: Vec8 = [
        self.delays[0].read_lerp(),
        self.delays[1].read_lerp(),
        self.delays[2].read_lerp(),
        self.delays[3].read_lerp(),
        self.delays[4].read_lerp(),
        self.delays[5].read_lerp(),
        self.delays[6].read_lerp(),
        self.delays[7].read_lerp(),
      ];

      let size = self.size.at(sample);
      for i in 0..8 {
        self.delays[i].set_delay(
          PRIMES[i] * ((i + 1) as f32 / 4.0) * size * 10.0
            + self.modulation.sin() * 20.0 * mod_amount,
        );
      }

      // 8th order Hadamard x Vec8 multiplication
      let mut first_half = f32x4_mul(hadamard[0], f32x4_splat(vec[0]));
      first_half = f32x4_add(first_half, f32x4_mul(hadamard[1], f32x4_splat(vec[1])));
      first_half = f32x4_add(first_half, f32x4_mul(hadamard[2], f32x4_splat(vec[2])));
      first_half = f32x4_add(first_half, f32x4_mul(hadamard[3], f32x4_splat(vec[3])));

      let mut last_half = f32x4_mul(hadamard[0], f32x4_splat(vec[4]));
      last_half = f32x4_add(last_half, f32x4_mul(hadamard[1], f32x4_splat(vec[5])));
      last_half = f32x4_add(last_half, f32x4_mul(hadamard[2], f32x4_splat(vec[6])));
      last_half = f32x4_add(last_half, f32x4_mul(hadamard[3], f32x4_splat(vec[7])));

      let vec0_3 = f32x4_add(first_half, last_half);
      let vec4_7 = f32x4_sub(first_half, last_half);

      let mut feedback: Vec8 = [0.0; 8];
      unsafe {
        v128_store(feedback.as_mut_ptr() as *mut v128, vec4_7);
        v128_store(feedback.as_mut_ptr().offset(4) as *mut v128, vec0_3);
      }

      for i in 0..8 {
        self.delays[i].write(input + feedback[i] * decay * 0.35355339059327373);
      }

      self.modulation += mod_speed * 0.001;

      let dry_wet = self.dry_wet.at(sample);
      self.output[sample] = (input * dry_wet) + vec.iter().sum::<f32>() * (1.0 - dry_wet);
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.dry_wet,
      &mut self.mod_amount,
      &mut self.mod_speed,
      &mut self.decay,
      &mut self.size,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }
}

impl FDNReverb {
  pub fn new() -> Box<FDNReverb> {
    Box::new(FDNReverb {
      input: AudioInput::default(),
      output: AudioOutput::default(),
      dry_wet: AudioParam::default(),
      mod_amount: AudioParam::default(),
      mod_speed: AudioParam::default(),
      decay: AudioParam::default(),
      size: AudioParam::default(),

      modulation: 0.0,

      delays: [
        VariableDelayLineInterpolated::new(SAMPLE_RATE * 10, PRIMES[0] * 1.0),
        VariableDelayLineInterpolated::new(SAMPLE_RATE * 10, PRIMES[1] * 2.0),
        VariableDelayLineInterpolated::new(SAMPLE_RATE * 10, PRIMES[2] * 3.0),
        VariableDelayLineInterpolated::new(SAMPLE_RATE * 10, PRIMES[3] * 4.0),
        VariableDelayLineInterpolated::new(SAMPLE_RATE * 10, PRIMES[4] * 5.0),
        VariableDelayLineInterpolated::new(SAMPLE_RATE * 10, PRIMES[5] * 6.0),
        VariableDelayLineInterpolated::new(SAMPLE_RATE * 10, PRIMES[6] * 7.0),
        VariableDelayLineInterpolated::new(SAMPLE_RATE * 10, PRIMES[7] * 8.0),
      ],
    })
  }
}
