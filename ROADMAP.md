# Roadmap

This roadmap is a direction, not a promise. Each item ships when it is tested and documented.

## 0.1 — current

- [x] Gauge pill in the sidebar footer.
- [x] Floating panel above the pill, constrained to the sidebar.
- [x] 5-hour, weekly and monthly windows.
- [x] Remaining percentage, reset countdown and time-left marker.
- [x] Pace tooltip on the whole progress bar.
- [x] Requests only while open, with one-minute open cooldown, five-minute auto refresh and one-minute manual refresh.
- [x] Responsive at narrow widths; all reset lines hide together when the longest would wrap.
- [x] Spanish and English.
- [x] Unit tests and CI.

## 0.2 — placement and translations

### Configurable pill placement

| Zone | Placement |
| --- | --- |
| Sidebar footer | Above the update pill (current default) |
| Session header | Between the project panel and the context buttons `Summary` and `Show/hide review` |
| Sidebar header | Immediately to the right of `Show/hide sidebar` |
| Composer | Immediately to the right of the effort selector in the model selection row |

The panel must follow the chosen zone: open upward from the footer, downward from the titlebar, and anchored to the composer without covering the conversation.

### Translations

- [x] Spanish
- [x] English
- [ ] Portuguese (Brazil)
- [ ] French
- [ ] German
- [ ] Italian
- [ ] Japanese
- [ ] Simplified Chinese

New locales are community contributions. Keep the same keys and placeholders as the English catalog.

## 0.3 — desktop layouts

- [ ] Horizontal titlebar tabs.
- [ ] Inbox layout.
- [ ] Narrow and mobile titlebar positions.
- [ ] Panel anchoring and sizing for each layout.
- [ ] Visual checks at 125% and 150% display scale.

## 1.0 — stable

- [ ] Compatibility matrix across OpenCode Desktop releases.
- [ ] Stable behavior after the GUI plugin API leaves experimental status.
- [ ] End-to-end check for plugin loading, placement and data refresh.
