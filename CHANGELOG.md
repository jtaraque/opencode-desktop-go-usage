# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
