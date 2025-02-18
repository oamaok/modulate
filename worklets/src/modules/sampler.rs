use crate::audio_input::AudioInput;
use crate::audio_output::AudioOutput;
use crate::audio_param::AudioParam;
use crate::edge_detector::EdgeDetector;
use crate::modulate_core::QUANTUM_SIZE;

use crate::module::{Module, ModuleEvent, ModuleMessage};
use crate::util::lerp;

pub struct Sampler {
  gate_input: AudioInput,
  edge_detector: EdgeDetector,
  speed: AudioParam,
  start: AudioParam,
  length: AudioParam,
  level: AudioParam,
  output: AudioOutput,
  pos: f64,
  sample: Option<Box<[f32]>>,
  events: Vec<ModuleEvent>,
}

impl Module for Sampler {
  fn process(&mut self, _quantum: u64) {
    for sample in 0..QUANTUM_SIZE {
      self.output[sample] = 0.0;

      let Some(audio_sample) = &self.sample else {
        continue;
      };

      let ipos = self.pos as usize;
      let sample_len = audio_sample.len();
      let len_param = self.length.at(sample);
      let start_param = self.start.at(sample);

      if self.edge_detector.step(self.gate_input.at(sample)).rose() {
        self.pos = start_param as f64 * sample_len as f64;
      }

      if ipos < sample_len {
        let a = audio_sample[ipos];
        let b = if ipos + 1 < sample_len {
          audio_sample[ipos + 1]
        } else {
          0.0
        };
        let t = f64::fract(self.pos);
        self.output[sample] = lerp(a, b, t as f32) * self.level.at(sample);
      }

      self.pos += self.speed.at(sample) as f64;
      self.pos = self.pos.clamp(
        0.0,
        f32::min(1.0, start_param + len_param) as f64 * sample_len as f64,
      );
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.gate_input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.speed,
      &mut self.start,
      &mut self.length,
      &mut self.level,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }

  fn pop_event(&mut self) -> Option<ModuleEvent> {
    self.events.pop()
  }

  fn on_message(&mut self, message: ModuleMessage) {
    match message {
      ModuleMessage::SamplerAllocate { size } => {
        let zeros = vec![0.0; size];
        self.sample = Some(zeros.into_boxed_slice());
        let ptr = self.sample.as_ref().unwrap().as_ptr() as usize;
        self
          .events
          .push(ModuleEvent::SamplerAllocateSuccess { ptr })
      }
      _ => panic!("sampler: received unhandled message"),
    }
  }

  fn get_pointers(&mut self) -> Vec<usize> {
    vec![&self.pos as *const f64 as usize]
  }
}

impl Sampler {
  pub fn new() -> Box<Sampler> {
    Box::new(Sampler {
      gate_input: AudioInput::default(),
      edge_detector: EdgeDetector::new(0.5),
      speed: AudioParam::default(),
      start: AudioParam::default(),
      length: AudioParam::default(),
      level: AudioParam::default(),
      output: AudioOutput::default(),
      pos: 0.0,
      sample: None,
      events: vec![],
    })
  }
}
