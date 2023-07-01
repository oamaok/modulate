#![feature(stdsimd)]
use core::arch::wasm32::{memory_atomic_notify, memory_atomic_wait32};
use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicI32, AtomicU64, AtomicUsize};
use std::sync::{Arc, Mutex};
use wasm_bindgen::prelude::*;

pub mod modulate_core;
pub mod module;
pub mod modules;
pub mod vec;
pub mod barrier;

use modules::{
  adsr, audio_out, biquad_filter, bouncy_boi, clock, delay, gain, lfo, limiter, midi, mixer,
  oscillator, pow_shaper, reverb, sequencer,
};

#[wasm_bindgen(inline_js = "export function now() { return performance.now() }")]
extern "C" {
    fn now() -> f64;
}

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(js_namespace = console)]
  fn log(s: &str);
}

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(extends = js_sys::Array, is_type_of = js_sys::Array::is_array, typescript_type = "[number, number]")]
  #[derive(Clone, Debug, PartialEq, Eq)]
  pub type IntegerTuple;
}

enum ConnectionTarget {
  Input(module::ModuleId, module::InputId),
  Parameter(module::ModuleId, module::ParameterId),
}

struct ModuleConnection {
  from: (module::ModuleId, module::OutputId),
  to: ConnectionTarget,
}

struct WorkerContext {
  barrier: *const barrier::Barrier
}

struct Worker {
  context: WorkerContext
}

impl Worker {
  fn run(&mut self) {
    unsafe {
      let barrier = self.context.barrier;
      loop {
        (*barrier).wait();
      }
    }
  }
}

struct ModulateEngine {
  next_id: u32,
  modules: HashMap<module::ModuleId, Box<dyn module::Module>>,
  connections: HashMap<module::ConnectionId, ModuleConnection>,
  audio_outputs: HashSet<module::ModuleId>,
  on_event_callback: js_sys::Function,
}

impl ModulateEngine {
  pub fn new(on_event_callback: js_sys::Function) -> ModulateEngine {
    ModulateEngine {
      next_id: 0,
      modules: HashMap::new(),
      connections: HashMap::new(),
      audio_outputs: HashSet::new(),
      on_event_callback,
    }
  }

  fn get_next_id(&mut self) -> u32 {
    let id = self.next_id;
    self.next_id += 1;
    id
  }

  pub fn create_module(&mut self, module_name: &str) -> module::ModuleId {
    let id = self.get_next_id() as module::ModuleId;
    match module_name {
      "AudioOut" => {
        self
          .modules
          .insert(id, Box::new(audio_out::AudioOut::new()));
        self.audio_outputs.insert(id);
      }
      "Oscillator" => {
        self
          .modules
          .insert(id, Box::new(oscillator::Oscillator::new()));
      }
      "LFO" => {
        self.modules.insert(id, Box::new(lfo::LFO::new()));
      }
      "BiquadFilter" => {
        self
          .modules
          .insert(id, Box::new(biquad_filter::BiquadFilter::new()));
      }
      "Mixer" => {
        self.modules.insert(id, Box::new(mixer::Mixer::new()));
      }
      "Gain" => {
        self.modules.insert(id, Box::new(gain::Gain::new()));
      }
      "Limiter" => {
        self.modules.insert(id, Box::new(limiter::Limiter::new()));
      }
      "PowShaper" => {
        self
          .modules
          .insert(id, Box::new(pow_shaper::PowShaper::new()));
      }
      "Sequencer" => {
        self
          .modules
          .insert(id, Box::new(sequencer::Sequencer::new()));
      }
      "ADSR" => {
        self.modules.insert(id, Box::new(adsr::ADSR::new()));
      }
      "Reverb" => {
        self.modules.insert(id, Box::new(reverb::Reverb::new()));
      }
      "Delay" => {
        self.modules.insert(id, Box::new(delay::Delay::new()));
      }
      "Clock" => {
        self.modules.insert(id, Box::new(clock::Clock::new()));
      }
      "MIDI" => {
        self.modules.insert(id, Box::new(midi::MIDI::new()));
      }
      "BouncyBoi" => {
        self
          .modules
          .insert(id, Box::new(bouncy_boi::BouncyBoi::new()));
      }
      _ => panic!("create_module: unimplemented module '{}'", module_name),
    }
    id
  }

  pub fn delete_module(&mut self, module_id: module::ModuleId) {
    self.audio_outputs.remove(&module_id);

    let connections_to_drop: Vec<module::ConnectionId> = self
      .connections
      .iter()
      .filter(|(_, connection)| {
        let (from_module_id, _) = connection.from;
        let to_module_id = match connection.to {
          ConnectionTarget::Input(to_module_id, _) => to_module_id,
          ConnectionTarget::Parameter(to_module_id, _) => to_module_id,
        };

        from_module_id == module_id || to_module_id == module_id
      })
      .map(|(connection_id, _)| *connection_id)
      .collect();

    for connection_id in connections_to_drop {
      self.remove_connection(connection_id);
    }

    self.modules.remove(&module_id);
  }

  pub fn set_parameter_value(
    &mut self,
    module_id: module::ModuleId,
    parameter: module::ParameterId,
    value: f32,
  ) {
    let module = self.modules.get_mut(&module_id).unwrap();
    let mut parameters = module.get_parameters();
    let param = parameters.get_mut(parameter).unwrap();
    param.value = value;
  }

  pub fn connect_to_input(
    &mut self,
    from: (module::ModuleId, module::OutputId),
    to: (module::ModuleId, module::InputId),
  ) -> module::ConnectionId {
    let id = self.get_next_id() as module::ConnectionId;

    let (from_module_id, from_output) = from;
    let (to_module_id, to_input) = to;

    self.connections.insert(
      id,
      ModuleConnection {
        from,
        to: ConnectionTarget::Input(to_module_id, to_input),
      },
    );

    let output_buffer_ptr = {
      let from_module = self.modules.get_mut(&from_module_id).unwrap();
      from_module.get_output_buffer_ptr(from_output)
    };

    {
      let to_module = self.modules.get_mut(&to_module_id).unwrap();
      to_module.set_input_buffer_ptr(to_input, output_buffer_ptr);
    }

    id
  }

  pub fn connect_to_parameter(
    &mut self,
    from: (module::ModuleId, module::OutputId),
    to: (module::ModuleId, module::ParameterId),
  ) -> module::ConnectionId {
    let id = self.get_next_id() as module::ConnectionId;

    let (from_module_id, from_output) = from;
    let (to_module_id, to_parameter) = to;

    self.connections.insert(
      id,
      ModuleConnection {
        from,
        to: ConnectionTarget::Parameter(to_module_id, to_parameter),
      },
    );

    let output_buffer_ptr = {
      let from_module = self.modules.get_mut(&from_module_id).unwrap();
      from_module.get_output_buffer_ptr(from_output)
    };

    {
      let to_module = self.modules.get_mut(&to_module_id).unwrap();
      to_module.set_parameter_buffer_ptr(to_parameter, output_buffer_ptr);
    }

    id
  }

  pub fn remove_connection(&mut self, connection_id: module::ConnectionId) {
    let connection = self.connections.get(&connection_id).unwrap();

    match connection.to {
      ConnectionTarget::Input(to_module_id, to_input) => {
        let to_module = self.modules.get_mut(&to_module_id).unwrap();
        to_module.set_input_buffer_ptr(to_input, std::ptr::null());
      }
      ConnectionTarget::Parameter(to_module_id, to_parameter) => {
        let to_module = self.modules.get_mut(&to_module_id).unwrap();
        to_module.set_parameter_buffer_ptr(to_parameter, std::ptr::null());
      }
    }

    self.connections.remove(&connection_id);
  }

  pub fn send_message_to_module(&mut self, module_id: module::ModuleId, message: JsValue) {
    let module = self.modules.get_mut(&module_id).unwrap();

    // TODO: Move this deserialization to the wrapper
    match serde_wasm_bindgen::from_value(message) {
      Ok(msg) => module.on_message(msg),
      Err(err) => panic!("error deserializing message: {}", err.to_string().as_str()),
    }
  }

  pub fn process(&mut self, output_buffer: &mut modulate_core::AudioBuffer) {
    for (_, module) in self.modules.iter_mut() {
      module.swap_output_buffers();
    }

    for (_, module) in self.modules.iter_mut() {
      module.process();
    }

    for audio_output in self.audio_outputs.iter() {
      let module = self.modules.get_mut(audio_output).unwrap();
      let mut outputs = module.get_outputs();
      let output = outputs.get_mut(0).unwrap().current();
      for sample in 0..modulate_core::QUANTUM_SIZE {
        output_buffer[sample] += output[sample];
      }
    }

    for (module_id, module) in self.modules.iter_mut() {
      loop {
        match module.pop_event() {
          Some(message) => {
            let _ = self.on_event_callback.call2(
              &JsValue::null(),
              &JsValue::from(*module_id),
              &serde_wasm_bindgen::to_value(&message).unwrap(),
            );
          }
          None => break,
        };
      }
    }
  }
}

#[wasm_bindgen]
pub struct ModulateEngineWrapper {
  output: modulate_core::AudioBuffer,
  engine: ModulateEngine,
}

#[wasm_bindgen]
impl ModulateEngineWrapper {
  #[wasm_bindgen(constructor)]
  pub fn new(on_event_callback: js_sys::Function) -> ModulateEngineWrapper {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));

    ModulateEngineWrapper {
      output: modulate_core::AudioBuffer::default(),
      engine: ModulateEngine::new(on_event_callback),
    }
  }

  #[wasm_bindgen(js_name = createModule)]
  pub fn create_module(&mut self, module_name: &str) -> module::ModuleId {
    self.engine.create_module(module_name)
  }

  #[wasm_bindgen(js_name = deleteModule)]
  pub fn delete_module(&mut self, module_id: module::ModuleId) {
    self.engine.delete_module(module_id);
  }

  #[wasm_bindgen(js_name = setParameterValue)]
  pub fn set_parameter_value(
    &mut self,
    module_id: module::ModuleId,
    parameter: module::ParameterId,
    value: f32,
  ) {
    self.engine.set_parameter_value(module_id, parameter, value);
  }

  #[wasm_bindgen(js_name = connectToInput)]
  pub fn connect_to_input(&mut self, from: IntegerTuple, to: IntegerTuple) -> module::ConnectionId {
    // TODO: use serde
    let from_tuple: (module::ModuleId, module::OutputId) = match from
      .iter()
      .map(|x| x.as_f64().unwrap() as u32)
      .take(2)
      .collect::<Vec<u32>>()
      .as_slice()
    {
      [first, second] => (*first, *second as usize) as (module::ModuleId, module::OutputId),
      _ => panic!("`from` must be [u32, u32]"),
    };

    let to_tuple: (module::ModuleId, module::InputId) = match to
      .iter()
      .map(|x| x.as_f64().unwrap() as u32)
      .take(2)
      .collect::<Vec<u32>>()
      .as_slice()
    {
      [first, second] => (*first, *second as usize) as (module::ModuleId, module::InputId),
      _ => panic!("`to` must be [u32, u32]"),
    };

    self.engine.connect_to_input(from_tuple, to_tuple)
  }

  #[wasm_bindgen(js_name = connectToParameter)]
  pub fn connect_to_parameter(
    &mut self,
    from: IntegerTuple,
    to: IntegerTuple,
  ) -> module::ConnectionId {
    // TODO: use serde

    let from_tuple: (module::ModuleId, module::OutputId) = match from
      .iter()
      .map(|x| x.as_f64().unwrap() as u32)
      .take(2)
      .collect::<Vec<u32>>()
      .as_slice()
    {
      [first, second] => (*first, *second as usize) as (module::ModuleId, module::OutputId),
      _ => panic!("`from` must be [u32, u32]"),
    };

    let to_tuple: (module::ModuleId, module::InputId) = match to
      .iter()
      .map(|x| x.as_f64().unwrap() as u32)
      .take(2)
      .collect::<Vec<u32>>()
      .as_slice()
    {
      [first, second] => (*first, *second as usize) as (module::ModuleId, module::ParameterId),
      _ => panic!("`to` must be [u32, u32]"),
    };

    self.engine.connect_to_parameter(from_tuple, to_tuple)
  }

  #[wasm_bindgen(js_name = removeConnection)]
  pub fn remove_connection(&mut self, connection_id: module::ConnectionId) {
    self.engine.remove_connection(connection_id)
  }

  #[wasm_bindgen(js_name = getOutputBufferPtr)]
  pub fn get_output_buffer_ptr(&self) -> u32 {
    self.output.as_ptr() as u32
  }

  #[wasm_bindgen(js_name = sendMessageToModule)]
  pub fn send_message_to_module(&mut self, module_id: module::ModuleId, message: JsValue) {
    self.engine.send_message_to_module(module_id, message);
  }

  pub fn process(&mut self) {
    self.engine.process(&mut self.output);
  }
}

#[wasm_bindgen(js_name = workerEntry)]
pub fn worker_entry(ptr: usize) {
  unsafe {
    let worker = &mut *(ptr as *mut Worker);
    worker.run();
  }
}