use crate::audio_input::AudioInput;
use crate::audio_output::AudioOutput;
use crate::audio_param::{AudioParam, AudioParamModulationType};
use crate::{modulate_core::QUANTUM_SIZE, module::Module};
use rustfft::num_complex::ComplexFloat;
use rustfft::{num_complex::Complex, FftPlanner};

pub struct Sideq {
  input: AudioInput,
  output: AudioOutput,

  buckets: [f32; FFT_SIZE / 2],
  input_buffer: Vec<Complex<f32>>,
  output_buffer: Vec<Complex<f32>>,
  scratch_buffer: Vec<Complex<f32>>,
  fft_planner: FftPlanner<f32>,
}

const FFT_SIZE: usize = 8192;

impl Module for Sideq {
  fn process(&mut self, _quantum: u64) {
    let fft = self.fft_planner.plan_fft_forward(FFT_SIZE);

    self.input_buffer.rotate_left(QUANTUM_SIZE);

    for sample in 0..QUANTUM_SIZE {
      self.input_buffer[FFT_SIZE - QUANTUM_SIZE + sample] = Complex {
        re: self.input.at(sample),
        im: 0.0f32,
      };
    }
    fft.process_outofplace_with_scratch(
      &mut self.input_buffer,
      &mut self.output_buffer,
      &mut self.scratch_buffer,
    );

    for index in 0..(FFT_SIZE / 2) {
      self.buckets[index] = self.output_buffer[index].abs();
    }
  }

  fn get_pointers(&mut self) -> Vec<usize> {
    vec![&mut self.buckets as *mut [f32; FFT_SIZE / 2] as usize]
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }
}

impl Sideq {
  pub fn new() -> Box<Sideq> {
    Box::new(Sideq {
      input: AudioInput::default(),
      output: AudioOutput::default(),
      fft_planner: FftPlanner::new(),
      input_buffer: vec![
        Complex {
          re: 0.0f32,
          im: 0.0f32
        };
        FFT_SIZE
      ],
      output_buffer: vec![
        Complex {
          re: 0.0f32,
          im: 0.0f32
        };
        FFT_SIZE
      ],
      scratch_buffer: vec![
        Complex {
          re: 0.0f32,
          im: 0.0f32
        };
        FFT_SIZE
      ],
      buckets: [0.0f32; FFT_SIZE / 2],
    })
  }
}
