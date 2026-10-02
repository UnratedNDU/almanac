//! Hybrid logical clock: monotonic, totally ordered change stamps.
//!
//! String form `{ms:016x}-{counter:04x}-{node}` sorts lexicographically in time order,
//! so stamps can be compared as plain strings (also inside SQLite and on the server).

use std::time::{SystemTime, UNIX_EPOCH};

#[allow(dead_code)] // used by sync (v0.2.0)
#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum HlcError {
    #[error("malformed hlc stamp")]
    Malformed,
}

pub struct Hlc {
    node: String,
    last_ms: u64,
    counter: u16,
}

impl Hlc {
    pub fn new(node: &str) -> Self {
        Self { node: node.to_owned(), last_ms: 0, counter: 0 }
    }

    pub fn now(&mut self) -> String {
        let wall = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        self.now_at(wall)
    }

    /// Same as [`Hlc::now`] with an injectable wall clock (milliseconds since the epoch).
    pub fn now_at(&mut self, wall_ms: u64) -> String {
        if wall_ms > self.last_ms {
            self.last_ms = wall_ms;
            self.counter = 0;
        } else {
            self.tick();
        }
        self.stamp()
    }

    /// Advances the clock past a stamp received from another device.
    #[allow(dead_code)] // used by sync (v0.2.0)
    pub fn observe(&mut self, remote: &str) -> Result<(), HlcError> {
        let (ms, counter) = parse(remote)?;
        if (ms, counter) > (self.last_ms, self.counter) {
            self.last_ms = ms;
            self.counter = counter;
        }
        Ok(())
    }

    fn tick(&mut self) {
        match self.counter.checked_add(1) {
            Some(next) => self.counter = next,
            None => {
                self.last_ms += 1;
                self.counter = 0;
            }
        }
    }

    fn stamp(&self) -> String {
        format!("{:016x}-{:04x}-{}", self.last_ms, self.counter, self.node)
    }
}

#[allow(dead_code)] // used by sync (v0.2.0)
fn parse(stamp: &str) -> Result<(u64, u16), HlcError> {
    let mut parts = stamp.splitn(3, '-');
    let ms = parts.next().filter(|s| s.len() == 16).and_then(|s| u64::from_str_radix(s, 16).ok());
    let counter = parts.next().filter(|s| s.len() == 4).and_then(|s| u16::from_str_radix(s, 16).ok());
    match (ms, counter, parts.next()) {
        (Some(ms), Some(counter), Some(node)) if !node.is_empty() => Ok((ms, counter)),
        _ => Err(HlcError::Malformed),
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strictly_increasing_even_if_clock_repeats_or_goes_back() {
        let mut clock = Hlc::new("n1");
        let stamps: Vec<String> = [100, 100, 50, 101, 101].iter().map(|&ms| clock.now_at(ms)).collect();
        for pair in stamps.windows(2) {
            assert!(pair[0] < pair[1], "{} !< {}", pair[0], pair[1]);
        }
    }

    #[test]
    fn observe_remote_ahead_makes_next_greater() {
        let mut clock = Hlc::new("n1");
        let remote = format!("{:016x}-{:04x}-other", 1_000u64, 5u16);
        clock.observe(&remote).unwrap();
        assert!(clock.now_at(10) > remote);
    }

    #[test]
    fn observe_remote_behind_keeps_own_progress() {
        let mut clock = Hlc::new("n1");
        let own = clock.now_at(500);
        clock.observe(&format!("{:016x}-{:04x}-other", 100u64, 0u16)).unwrap();
        assert!(clock.now_at(1) > own);
    }

    #[test]
    fn lexicographic_order_matches_time_order() {
        let mut clock = Hlc::new("n1");
        let a = clock.now_at(0xf);
        let b = clock.now_at(0x10);
        let c = clock.now_at(0x1000);
        assert!(a < b && b < c);
    }

    #[test]
    fn stamp_ends_with_node_id() {
        let mut clock = Hlc::new("device-7");
        assert!(clock.now_at(1).ends_with("-device-7"));
    }

    #[test]
    fn observe_rejects_malformed() {
        let mut clock = Hlc::new("n1");
        for bad in ["", "garbage", "zz-0001-n", "0000000000000001-xyz-n", "0000000000000001"] {
            assert_eq!(clock.observe(bad), Err(HlcError::Malformed), "input: {bad}");
        }
    }
}