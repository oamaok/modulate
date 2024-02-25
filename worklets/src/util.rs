pub fn lerp(start: f32, end: f32, t: f32) -> f32 {
  start + t * (end - start)
}

pub fn exp_curve(x: f32) -> f32 {
  (3.0 + x * (-13.0 + 5.0 * x)) / (3.0 + 2.0 * x)
}

pub fn tension_interp(start: f32, end: f32, tension: f32, t: f32) -> f32 {
  start
    + (end - start)
      * if tension > 0.0 {
        let exp = 1.0 + tension * 2.0;
        1.0 - f32::powf(1.0 - f32::powf(t.clamp(0.0, 1.0), exp), 1.0 / exp)
      } else {
        let exp = 1.0 - tension * 2.0;
        f32::powf(1.0 - f32::powf(1.0 - t.clamp(0.0, 1.0), exp), 1.0 / exp)
      }
}
