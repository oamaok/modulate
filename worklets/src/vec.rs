use serde::{Serialize};

#[derive(Copy, Clone, Default, Serialize)]
pub struct Vec2 {
  pub x: f32,
  pub y: f32,
}

impl std::ops::Add<Vec2> for Vec2 {
  type Output = Vec2;

  fn add(self, rhs: Vec2) -> Vec2 {
    Vec2 {
      x: self.x + rhs.x,
      y: self.y + rhs.y,
    }
  }
}

impl std::ops::Mul<f32> for Vec2 {
  type Output = Vec2;

  fn mul(self, rhs: f32) -> Vec2 {
    Vec2 {
      x: self.x * rhs,
      y: self.y * rhs,
    }
  }
}

impl std::ops::Mul<Vec2> for f32 {
  type Output = Vec2;

  fn mul(self, rhs: Vec2) -> Vec2 {
    Vec2 {
      x: rhs.x * self,
      y: rhs.y * self,
    }
  }
}

impl std::ops::Sub<Vec2> for Vec2 {
  type Output = Vec2;

  fn sub(self, rhs: Vec2) -> Vec2 {
    Vec2 {
      x: self.x - rhs.x,
      y: self.y - rhs.y,
    }
  }
}

impl Vec2 {
  pub fn dot(&self, vec: Vec2) -> f32 {
    self.x * vec.x + self.y * vec.y
  }

  pub fn length(&self) -> f32 {
    f32::sqrt(self.x * self.x + self.y * self.y)
  }

  pub fn normalize(&self) -> Vec2 {
    let rcp_len = 1. / self.length();
    Vec2 {
      x: self.x * rcp_len,
      y: self.y * rcp_len,
    }
  }
}
