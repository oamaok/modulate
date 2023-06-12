use super::super::modulate_core;
use super::super::module;
use super::super::vec;

#[derive(Default)]
struct Rng {
  state: u64,
}

impl Rng {
  fn get_u32(&mut self) -> u32 {
    let oldstate = self.state;
    // Advance internal state
    self.state = oldstate.wrapping_mul(6364136223846793005u64) + 1u64;
    // Calculate output function (XSH RR), uses old state for max ILP
    let xorshifted: u32 = (((oldstate >> 18u64) ^ oldstate) >> 27u64) as u32;
    let rot: u32 = (oldstate >> 59u64) as u32;
    return (xorshifted >> rot) | (xorshifted << ((0u32.wrapping_sub(rot)) & 31));
  }

  fn get_f32(&mut self) -> f32 {
    self.get_u32() as f32 * 2.3283064e-10
  }
}

pub struct BouncyBoi {
  balls: [module::Ball; 3],
  trigger_outputs: [modulate_core::AudioOutput; 3],
  trigger_timers: [u32; 3],
  velocity_outputs: [modulate_core::AudioOutput; 3],

  speed: modulate_core::AudioParam,
  gravity: modulate_core::AudioParam,

  phase: f32,
  cycle_count: usize,
  events: Vec<module::ModuleEvent>,
}

#[derive(Copy, Clone, Default)]
struct Wall {
  from: vec::Vec2,
  to: vec::Vec2,
}

impl module::Module for BouncyBoi {
  fn process(&mut self) {
    let mut walls: [Wall; 5] = [Wall::default(); 5];

    for (i, wall) in walls.iter_mut().enumerate() {
      {
        let (sin, cos) = f32::sin_cos(i as f32 * std::f32::consts::PI * 2.0 / 5.0 + self.phase);

        wall.from.x = sin * 100.0;
        wall.from.y = cos * 100.0;
      }

      {
        let (sin, cos) =
          f32::sin_cos((i + 1) as f32 * std::f32::consts::PI * 2.0 / 5.0 + self.phase);

        wall.to.x = sin * 100.0;
        wall.to.y = cos * 100.0;
      }
    }

    self.phase += self.speed.at(0) * 0.01;

    for (i, ball) in self.balls.iter_mut().enumerate() {
      ball.vel.y += self.gravity.at(0) * 0.05;

      let speed = ball.vel.length();
      ball.vel = ball.vel.normalize() * f32::min(speed, 10.0);

      ball.pos = ball.pos + (ball.vel * 0.05);

      for wall in walls.iter() {
        let e = wall.to - wall.from;
        let n = vec::Vec2 { x: e.y, y: -e.x }.normalize();
        let d = ball.pos - wall.from;
        let distance = n.dot(d);

        if distance < 10.0 {
          let depth = 10.0 - distance;

          self.trigger_timers[i] = 4000;
          self.velocity_outputs[i][0] = ball.vel.length() / 5.0;

          ball.pos = ball.pos + n * depth;
          ball.vel = ball.vel - n * f32::min(0.0, 2.01 * ball.vel.dot(n));
        }
      }
    }

    for sample in 0..modulate_core::QUANTUM_SIZE {
      for i in 0..3 {
        if sample != 0 {
          self.velocity_outputs[i][sample] = self.velocity_outputs[i].previous[0];
        }
        if self.trigger_timers[i] != 0 {
          self.trigger_outputs[i][sample] = 1.0;
          self.trigger_timers[i] -= 1;
        } else {
          self.trigger_outputs[i][sample] = 0.0;
        }
      }
    }

    self.cycle_count += 1;
    // Each cycle is about 2.9ms, five cycles is a bit over 60hz
    if self.cycle_count >= 5 {
      self.cycle_count = 0;
      self.events.push(module::ModuleEvent::BouncyBoiUpdate {
        balls: self.balls,
        phase: self.phase,
      })
    }
  }

  fn pop_event(&mut self) -> Option<module::ModuleEvent> {
    self.events.pop()
  }

  fn get_parameters(&mut self) -> Vec<&mut modulate_core::AudioParam> {
    vec![&mut self.speed, &mut self.gravity]
  }

  fn get_outputs(&mut self) -> Vec<&mut modulate_core::AudioOutput> {
    let mut outputs = vec![];

    for trigger_output in self.trigger_outputs.iter_mut() {
      outputs.push(trigger_output);
    }

    for velocity_output in self.velocity_outputs.iter_mut() {
      outputs.push(velocity_output);
    }

    outputs
  }
}

impl BouncyBoi {
  pub fn new() -> BouncyBoi {
    let mut boi = BouncyBoi {
      balls: [
        module::Ball::default(),
        module::Ball::default(),
        module::Ball::default(),
      ],
      trigger_outputs: [
        modulate_core::AudioOutput::default(),
        modulate_core::AudioOutput::default(),
        modulate_core::AudioOutput::default(),
      ],
      trigger_timers: [0, 0, 0],
      velocity_outputs: [
        modulate_core::AudioOutput::default(),
        modulate_core::AudioOutput::default(),
        modulate_core::AudioOutput::default(),
      ],

      speed: modulate_core::AudioParam::default(),
      gravity: modulate_core::AudioParam::default(),

      phase: 0.0,
      cycle_count: 0,
      events: vec![],
    };
    let mut rng = Rng::default();

    for ball in boi.balls.iter_mut() {
      ball.pos.x = 0.0;
      ball.pos.y = 0.0;
      ball.vel.x = rng.get_f32() * 2.0 - 1.0;
      ball.vel.y = rng.get_f32() * 2.0 - 1.0;
    }

    boi
  }
}
