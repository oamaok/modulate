use wasm_bindgen::prelude::*;

pub const SAMPLE_RATE: usize = 44100;
pub const SAMPLE_RATE_F32: f32 = SAMPLE_RATE as f32;
pub const QUANTUM_SIZE: usize = 128;
pub const INV_SAMPLE_RATE: f32 = 1.0 / SAMPLE_RATE as f32;
pub const AUDIO_OUTPUT_NUM_BUFFERS: usize = 2;

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(js_namespace = console)]
  pub fn log(s: &str);
}
