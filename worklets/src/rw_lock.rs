use core::arch::wasm32::{memory_atomic_notify, memory_atomic_wait32};

use std::sync::atomic::{AtomicI32, Ordering};

pub struct RwLock {
  state: AtomicI32,
}

impl RwLock {
  pub fn new() -> RwLock {
    RwLock {
      state: AtomicI32::new(0),
    }
  }

  pub fn lock_read(&mut self) {
    loop {
      let readers = self.state.load(Ordering::SeqCst);

      if readers < 0 {
        unsafe {
          memory_atomic_wait32(&mut self.state as *mut AtomicI32 as *mut i32, readers, -1);
        }
        continue;
      }

      if self
        .state
        .compare_exchange(readers, readers + 1, Ordering::SeqCst, Ordering::SeqCst)
        .is_ok()
      {
        break;
      }
    }
  }

  pub fn unlock_read(&mut self) {
    if self.state.fetch_sub(1, Ordering::SeqCst) == 1 {
      unsafe { memory_atomic_notify(&mut self.state as *mut AtomicI32 as *mut i32, u32::MAX) };
    }
  }

  pub fn lock_write(&mut self) {
    loop {
      match self
        .state
        .compare_exchange(0, -1, Ordering::SeqCst, Ordering::SeqCst)
      {
        Ok(_) => break,
        Err(v) => unsafe {
          memory_atomic_wait32(&mut self.state as *mut AtomicI32 as *mut i32, v, -1);
        },
      }
    }
  }

  pub fn unlock_write(&mut self) {
    self.state.store(0, Ordering::SeqCst);
    unsafe { memory_atomic_notify(&mut self.state as *mut AtomicI32 as *mut i32, u32::MAX) };
  }
}
