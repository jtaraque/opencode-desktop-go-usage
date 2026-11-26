# Roadmap

This roadmap is a direction, not a promise. Each item ships when it is tested and documented.

## 0.1 — shipped

- [x] Gauge pill in the sidebar footer.
- [x] Floating panel above the pill, constrained to the sidebar.
- [x] 5-hour, weekly and monthly windows.
- [x] Remaining percentage, reset countdown and time-left marker.
- [x] Pace tooltip on the whole progress bar.
- [x] Requests only while open, with one-minute open cooldown, five-minute auto refresh and one-minute manual refresh.
- [x] Responsive at narrow widths; all reset lines hide together when the longest would wrap.
- [x] Spanish and English.
- [x] Unit tests and CI.

## 0.2 — configurable placement (shipped)

- [x] Sliders button in the panel header opens **Position**.
- [x] Update-button placement (sidebar footer in side tabs, tab strip in top tabs).
- [x] Session header placement, left of the context controls.
- [x] Sidebar header placement, right of the sidebar toggle.
- [x] Sidebar-header panel starts below the session breadcrumb.
- [x] The pill pulses briefly after a placement change.
- [x] Placement stored globally.
- [x] Top-tab fallback: the sidebar-header option is disabled; other placements stay valid.
- [x] Unavailable placements are disabled in **Position**.
- [x] The panel closes while OpenCode settings are open and reopens on return.
- [x] Panel may overlap the chat for header and sidebar placements.
- [x] Inbox layout: all three placements, with the panel anchored to the session list.
- [x] Placement fallback tests.
- [x] Eight interface languages: Spanish, English, German, French, Portuguese (Brazil), Italian, Japanese and Simplified Chinese.
- [x] Reset times follow the interface language.

## 0.3 — remaining desktop layouts

- [ ] Draggable panel in the **Position** view, with offsets stored per placement.
- [ ] **Restore default position** button for the current placement.
- [ ] Narrow window and mobile titlebar positions.
- [ ] Visual pass at 150% display scale. 125% already passed in side and top tabs.


## 1.0 — stable

- [ ] Compatibility matrix across OpenCode Desktop releases.
- [ ] Stable behavior after the GUI plugin API leaves experimental status.
- [ ] End-to-end check for plugin loading, placement and data refresh.
