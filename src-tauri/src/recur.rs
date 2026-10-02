//! Expands an event (single or recurring) into the occurrences visible in a date range.
//!
//! Times are floating local time: they are treated as UTC internally so daylight-saving
//! shifts never move an event. ponytail: add real time zones if travelling matters.

use std::collections::HashSet;

use chrono::{DateTime, NaiveDate, NaiveDateTime, TimeDelta, TimeZone};
use rrule::{RRuleSet, Tz};

use crate::model::Event;

/// Safety cap on occurrences generated per event and query.
const MAX_OCCURRENCES: u16 = 5_000;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Occurrence {
    pub event_id: String,
    /// `YYYY-MM-DD` for all-day events, `YYYY-MM-DDTHH:MM` otherwise.
    pub start: String,
    /// All-day: inclusive last day, only when it differs from `start`. Timed: only when the event has an end.
    pub end: Option<String>,
    pub recurring: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum RecurError {
    #[error("invalid recurrence rule: {0}")]
    BadRule(String),
    #[error("invalid date: {0}")]
    BadDate(String),
}

const DATE_FMT: &str = "%Y-%m-%d";
const DATETIME_FMT: &str = "%Y-%m-%dT%H:%M";

fn midnight(date: NaiveDate) -> NaiveDateTime {
    date.and_hms_opt(0, 0, 0).expect("midnight is always valid")
}

fn parse_date(s: &str) -> Result<NaiveDate, RecurError> {
    NaiveDate::parse_from_str(s, DATE_FMT).map_err(|_| RecurError::BadDate(s.to_owned()))
}

/// Accepts `YYYY-MM-DD` (midnight) or `YYYY-MM-DDTHH:MM`.
fn parse_moment(s: &str) -> Result<NaiveDateTime, RecurError> {
    NaiveDateTime::parse_from_str(s, DATETIME_FMT)
        .or_else(|_| parse_date(s).map(midnight))
        .map_err(|_| RecurError::BadDate(s.to_owned()))
}

fn format_moment(dt: NaiveDateTime, all_day: bool) -> String {
    dt.format(if all_day { DATE_FMT } else { DATETIME_FMT }).to_string()
}

/// How long one occurrence lasts. Never shorter than a minute (timed) or a day (all-day),
/// so every occurrence has a non-empty interval to test for overlap. All-day `end` is inclusive.
fn span_of(ev: &Event, start: NaiveDateTime) -> Result<TimeDelta, RecurError> {
    let minimum = if ev.all_day { TimeDelta::days(1) } else { TimeDelta::minutes(1) };
    let span = match &ev.end {
        Some(end) => {
            let end = parse_moment(end)?;
            (if ev.all_day { end + TimeDelta::days(1) } else { end }) - start
        }
        None => minimum,
    };
    Ok(span.max(minimum))
}

fn utc(dt: NaiveDateTime) -> DateTime<Tz> {
    Tz::UTC.from_utc_datetime(&dt)
}

/// Starts of the series between `from` and `to` (widened by a day each side; callers filter exactly).
fn series_starts(
    rule: &str,
    start: NaiveDateTime,
    from: NaiveDateTime,
    to: NaiveDateTime,
) -> Result<Vec<NaiveDateTime>, RecurError> {
    if rule.contains(['\n', '\r']) {
        return Err(RecurError::BadRule("line breaks are not allowed".into()));
    }
    let text = format!("DTSTART:{}\nRRULE:{rule}", start.format("%Y%m%dT%H%M%SZ"));
    let set: RRuleSet = text.parse().map_err(|e| RecurError::BadRule(format!("{e}")))?;
    let day = TimeDelta::days(1);
    let set = set.after(utc(from - day)).before(utc(to + day));
    Ok(set.all(MAX_OCCURRENCES).dates.into_iter().map(|d| d.naive_utc()).collect())
}

/// Occurrences overlapping `[from, to)` (both `YYYY-MM-DD`), excluding `exdates`, ordered by start.
pub fn expand(ev: &Event, from: &str, to: &str) -> Result<Vec<Occurrence>, RecurError> {
    let range_start = midnight(parse_date(from)?);
    let range_end = midnight(parse_date(to)?);
    let start = parse_moment(&ev.start)?;
    let span = span_of(ev, start)?;
    let starts = match &ev.rrule {
        Some(rule) => series_starts(rule, start, range_start - span, range_end)?,
        None => vec![start],
    };
    // A corrupt exdate must not hide the whole calendar, so unparsable ones are ignored.
    let skipped: HashSet<NaiveDateTime> = ev.exdates.iter().filter_map(|s| parse_moment(s).ok()).collect();

    Ok(starts
        .into_iter()
        .filter(|s| *s + span > range_start && *s < range_end && !skipped.contains(s))
        .map(|s| Occurrence {
            event_id: ev.id.clone(),
            start: format_moment(s, ev.all_day),
            end: occurrence_end(ev, s, span),
            recurring: ev.rrule.is_some(),
        })
        .collect())
}

fn occurrence_end(ev: &Event, start: NaiveDateTime, span: TimeDelta) -> Option<String> {
    if ev.all_day {
        let last = (start + span - TimeDelta::days(1)).date();
        (last > start.date()).then(|| last.format(DATE_FMT).to_string())
    } else {
        ev.end.as_ref().map(|_| format_moment(start + span, false))
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    fn event(start: &str, end: Option<&str>, all_day: bool, rrule: Option<&str>) -> Event {
        Event {
            id: "e1".into(),
            start: start.into(),
            end: end.map(Into::into),
            all_day,
            rrule: rrule.map(Into::into),
            ..Event::default()
        }
    }

    fn starts(occ: Vec<Occurrence>) -> Vec<String> {
        occ.into_iter().map(|o| o.start).collect()
    }

    #[test]
    fn single_event_inside_and_outside_range() {
        let ev = event("2026-08-20T09:00", None, false, None);
        let inside = expand(&ev, "2026-08-01", "2026-09-01").unwrap();
        assert_eq!(inside, vec![Occurrence { event_id: "e1".into(), start: "2026-08-20T09:00".into(), end: None, recurring: false }]);
        assert!(expand(&ev, "2026-09-01", "2026-10-01").unwrap().is_empty());
    }

    #[test]
    fn range_end_is_exclusive_and_start_inclusive() {
        let ev = event("2026-08-20", None, true, None);
        assert_eq!(expand(&ev, "2026-08-20", "2026-08-21").unwrap().len(), 1);
        assert!(expand(&ev, "2026-08-21", "2026-08-22").unwrap().is_empty());
        assert!(expand(&ev, "2026-08-19", "2026-08-20").unwrap().is_empty());
    }

    #[test]
    fn multi_day_event_overlapping_range_is_included() {
        let ev = event("2026-07-30", Some("2026-08-02"), true, None);
        let occ = expand(&ev, "2026-08-01", "2026-09-01").unwrap();
        assert_eq!(occ.len(), 1);
        assert_eq!((occ[0].start.as_str(), occ[0].end.as_deref()), ("2026-07-30", Some("2026-08-02")));
    }

    #[test]
    fn birthday_yearly_appears_every_year() {
        let ev = event("1990-03-14", None, true, Some("FREQ=YEARLY"));
        assert_eq!(starts(expand(&ev, "2026-03-01", "2026-04-01").unwrap()), vec!["2026-03-14"]);
        assert_eq!(starts(expand(&ev, "2027-03-01", "2027-04-01").unwrap()), vec!["2027-03-14"]);
        assert!(expand(&ev, "2026-04-01", "2026-05-01").unwrap().is_empty());
        assert!(expand(&ev, "2026-03-01", "2026-04-01").unwrap()[0].recurring);
    }

    #[test]
    fn weekly_byday_with_exdate_skips_it() {
        let mut ev = event("2026-08-03T10:00", None, false, Some("FREQ=WEEKLY;BYDAY=MO,WE"));
        ev.exdates = vec!["2026-08-05T10:00".into()];
        let got = starts(expand(&ev, "2026-08-03", "2026-08-17").unwrap());
        assert_eq!(got, vec!["2026-08-03T10:00", "2026-08-10T10:00", "2026-08-12T10:00"]);
    }

    #[test]
    fn all_day_exdate_uses_date_format() {
        let mut ev = event("2026-08-01", None, true, Some("FREQ=DAILY;COUNT=3"));
        ev.exdates = vec!["2026-08-02".into()];
        assert_eq!(starts(expand(&ev, "2026-08-01", "2026-09-01").unwrap()), vec!["2026-08-01", "2026-08-03"]);
    }

    #[test]
    fn count_and_until_limit_the_series() {
        let counted = event("2026-08-01", None, true, Some("FREQ=DAILY;COUNT=3"));
        assert_eq!(expand(&counted, "2026-08-01", "2026-09-01").unwrap().len(), 3);
        let until = event("2026-08-01", None, true, Some("FREQ=DAILY;UNTIL=20260803T235959Z"));
        assert_eq!(expand(&until, "2026-08-01", "2026-09-01").unwrap().len(), 3);
    }

    #[test]
    fn monthly_on_31st_skips_short_months() {
        let ev = event("2026-01-31", None, true, Some("FREQ=MONTHLY"));
        let got = starts(expand(&ev, "2026-01-01", "2026-07-01").unwrap());
        assert_eq!(got, vec!["2026-01-31", "2026-03-31", "2026-05-31"]);
    }

    #[test]
    fn feb_29_yearly_only_in_leap_years() {
        let ev = event("2024-02-29", None, true, Some("FREQ=YEARLY"));
        assert_eq!(starts(expand(&ev, "2025-01-01", "2029-01-01").unwrap()), vec!["2028-02-29"]);
    }

    #[test]
    fn running_multi_day_occurrence_that_started_before_range_is_included() {
        let ev = event("2025-07-31", Some("2025-08-02"), true, Some("FREQ=YEARLY"));
        let occ = expand(&ev, "2026-08-01", "2026-08-02").unwrap();
        assert_eq!(occ.len(), 1);
        assert_eq!((occ[0].start.as_str(), occ[0].end.as_deref()), ("2026-07-31", Some("2026-08-02")));
    }

    #[test]
    fn keeps_each_events_date_format() {
        let timed = event("2026-08-20T09:30", Some("2026-08-20T10:15"), false, None);
        let occ = expand(&timed, "2026-08-20", "2026-08-21").unwrap();
        assert_eq!((occ[0].start.as_str(), occ[0].end.as_deref()), ("2026-08-20T09:30", Some("2026-08-20T10:15")));
        let all_day = event("2026-08-20", None, true, None);
        assert_eq!(expand(&all_day, "2026-08-20", "2026-08-21").unwrap()[0].start, "2026-08-20");
    }

    #[test]
    fn invalid_input_returns_errors() {
        let bad_rule = event("2026-08-20", None, true, Some("FREQ=NOPE"));
        assert!(matches!(expand(&bad_rule, "2026-08-01", "2026-09-01"), Err(RecurError::BadRule(_))));
        let injected = event("2026-08-20", None, true, Some("FREQ=DAILY\nEXDATE:20260820T000000Z"));
        assert!(matches!(expand(&injected, "2026-08-01", "2026-09-01"), Err(RecurError::BadRule(_))));
        let bad_date = event("garbage", None, true, None);
        assert!(matches!(expand(&bad_date, "2026-08-01", "2026-09-01"), Err(RecurError::BadDate(_))));
        let ok = event("2026-08-20", None, true, None);
        assert!(matches!(expand(&ok, "nope", "2026-09-01"), Err(RecurError::BadDate(_))));
    }
}