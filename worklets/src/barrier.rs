use core::arch::wasm32::{memory_atomic_notify, memory_atomic_wait32};
use std::sync::atomic::AtomicI32;

pub struct Barrier {
  num_threads: usize,
  generation_id: AtomicI32,
  count: AtomicI32,
}

impl Barrier {
  pub fn new(num_threads: usize) -> Barrier {
    Barrier {
      num_threads,
      generation_id: AtomicI32::new(0),
      count: AtomicI32::new(0),
    }
  }

  pub fn wait(&self) -> bool {
    let local_gen = self
      .generation_id
      .load(std::sync::atomic::Ordering::Acquire);
    let count = self.count.fetch_add(1, std::sync::atomic::Ordering::AcqRel);

    if count < self.num_threads as i32 - 1 {
      loop {
        unsafe {
          if memory_atomic_wait32(self.generation_id.as_ptr(), local_gen, -1) == 1 {
            break;
          }
        }
      }
      false
    } else {
      self.count.store(0, std::sync::atomic::Ordering::Release);
      self.generation_id.store(
        local_gen.wrapping_add(1),
        std::sync::atomic::Ordering::Release,
      );
      unsafe {
        memory_atomic_notify(self.generation_id.as_ptr(), u32::MAX);
      }
      true
    }
  }
}
