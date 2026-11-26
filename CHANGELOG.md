# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] - 2026-11-26

### Added

- Position settings inside the panel, opened from the sliders button.
- Three pill placements: next to update, session header and sidebar header.
- Header pill sits left of the session context controls.
- Sidebar-header pill sits immediately right of the sidebar toggle.
- Sidebar-header panel starts below the session breadcrumb.
- The pill pulses for about two seconds after a placement change so it is easy to find.
- Inbox layout support for all three placements.
- Interface translations for German, French, Portuguese (Brazil), Italian, Japanese and Simplified Chinese.
- Reset timestamps follow the interface language.
- Top-tab behavior: the sidebar-header option is disabled; the update-button placement uses the tab strip.
- Unavailable placements are disabled in **Position**.
- The panel closes while OpenCode settings are open and reopens on return.
- Placement is stored globally and survives window reloads.

### Changed

- The panel can overlap the chat when anchored to the header or sidebar header.
- The sliders icon from the app replaces the custom gear artwork.
- The update-button placement is named after the update button, not the sidebar footer.

### Fixed

- The panel in top tabs now ignores the window drag region; the panel buttons and the settings view respond to clicks instead of maximizing the window.
- The top-tabs panel sits 10 px lower, clear of the tab strip.

### Tests

- Added placement fallback tests.

## [0.1.0] - 2026-11-26

### Added

- Gauge pill in the OpenCode Desktop sidebar footer.
- Floating usage panel that opens upward and stays inside the sidebar.
- Closes with the pill or the X; outside clicks and Escape leave it open.
- Responsive at narrow sidebar widths and short heights; the panel scrolls instead of clipping and all reset lines hide together when the longest one would wrap.
- Rolling 5-hour, weekly and monthly OpenCode Go allowance.
- Remaining percentage, reset countdown and time-left marker.
- Pace tooltip on the whole progress bar.
- Manual refresh with a one-minute cooldown and automatic refresh every 5 minutes while open.
- Header timestamp shows Just now for the first minute, then whole minutes.
- Requests only while the panel is open; reopening within a minute reuses the cached result.
- Spanish and English copy.
- Console link and empty, loading and error states.
- Unit tests for window math and pace.
