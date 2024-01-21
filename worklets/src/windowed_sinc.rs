use modulate_macros::generate_windowed_sinc_tables;

generate_windowed_sinc_tables!(20, 8);

pub fn windowed_sinc(x: f32) -> f32 {
  assert!((x as usize) <= HALF_WINDOW_SIZE);

  let index = (x * STEPS as f32).abs();
  let index_int = index as usize;
  let index_fract = index.fract();

  WINDOWED_SINC_VALUES[index_int] + WINDOWED_SINC_DISTANCES[index_int] * index_fract
}

pub fn windowed_sinc_sample(position: f32, buffer: &[f32]) -> f32 {
  let mut sample = 0.0;

  let position_int = position as i32;
  let position_fract = position.fract();
  let size = buffer.len() as i32;

  if position_fract < f32::EPSILON {
    return buffer[position_int as usize];
  }

  for i in -(HALF_WINDOW_SIZE as i32 - 1)..(HALF_WINDOW_SIZE as i32) {
    let index = {
      if position_int < -i {
        size + position_int + i
      } else if position_int + i >= size {
        position_int + i - size
      } else {
        position_int + i
      }
    };

    assert!(index >= 0);
    assert!(index < size);

    sample += windowed_sinc((i as f32) + position_fract) * buffer[index as usize];
  }

  sample
}
