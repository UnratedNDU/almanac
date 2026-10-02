//! Plain data types. Everything here is serialized to JSON, sealed, and stored as a record blob.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum EventKind {
    #[default]
    Event,
    Birthday,
    Anniversary,
    Special,
}

/// Dates are floating local time (no time zone): `YYYY-MM-DD` when `all_day`, else `YYYY-MM-DDTHH:MM`.
/// An empty `id` means "new event"; the vault assigns one on save.
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Event {
    pub id: String,
    pub title: String,
    pub notes: String,
    pub start: String,
    pub end: Option<String>,
    pub all_day: bool,
    pub color: String,
    pub category_id: Option<String>,
    pub kind: EventKind,
    /// RFC 5545 rule body without the `RRULE:` prefix, e.g. `FREQ=YEARLY`.
    pub rrule: Option<String>,
    /// Skipped occurrences, in the same format as `start`.
    pub exdates: Vec<String>,
    pub reminder_minutes: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    /// `system`, `light`, `dark`, `midnight`, `forest`, `sunset` or `paper`.
    pub theme: String,
    pub accent: String,
    /// `comfortable` or `compact`.
    pub density: String,
    pub font_scale: f32,
    /// 0 = Sunday .. 6 = Saturday.
    pub week_start: u8,
    pub auto_lock_minutes: u32,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: "system".into(),
            accent: "#5b7cfa".into(),
            density: "comfortable".into(),
            font_scale: 1.0,
            week_start: 1,
            auto_lock_minutes: 5,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn partial_json_from_the_ui_fills_defaults() {
        let ev: Event = serde_json::from_str(r#"{"title":"Dentist","start":"2026-08-20T09:00"}"#).unwrap();
        assert_eq!(ev.title, "Dentist");
        assert!(ev.id.is_empty() && !ev.all_day && ev.exdates.is_empty());
        assert_eq!(ev.kind, EventKind::Event);
    }

    #[test]
    fn event_serializes_camel_case() {
        let ev = Event { all_day: true, kind: EventKind::Birthday, ..Event::default() };
        let json = serde_json::to_string(&ev).unwrap();
        assert!(json.contains("\"allDay\":true") && json.contains("\"kind\":\"birthday\""));
    }

    #[test]
    fn settings_default_is_sensible() {
        let s: Settings = serde_json::from_str("{}").unwrap();
        assert_eq!((s.theme.as_str(), s.week_start, s.auto_lock_minutes), ("system", 1, 5));
    }
}