# Contributing

Thanks for taking the time to improve `opencode-desktop-go-usage`.

## Before you start

- Open an issue for a bug or a feature before a large pull request.
- Keep each pull request focused on one change.
- For UI changes, include a screenshot or a short recording.
- By contributing, you agree that your changes are released under the MIT license.

## Setup

Requirements: Node.js 22 or newer and npm.

```sh
git clone https://github.com/jtaraque/opencode-desktop-go-usage.git
cd opencode-desktop-go-usage
npm ci
npm run dev
```

`npm run dev` builds `dist/gui-experimental.cjs` on every change. A local plugin entry lets OpenCode Desktop reload the GUI when the bundle changes.

To load your checkout in the desktop app, add its absolute path to the global `opencode.json(c)`:

```jsonc
{
  "plugins": [
    "C:/Users/you/opencode-desktop-go-usage"
  ]
}
```

Reload the window and check **Settings → Extensions → Plugins**.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Build in watch mode |
| `npm run build` | Build the GUI bundle |
| `npm run typecheck` | Run TypeScript without emitting |
| `npm run test` | Run the unit tests |
| `npm run check` | Typecheck, tests and build |

Run `npm run check` before opening a pull request.

## Project layout

```text
src/gui.tsx        window setup, pill, panel, data fetching and rendering
src/usage.ts       pure window math: remaining percentage, reset window, pace
src/usage.test.ts  unit tests for usage.ts
src/style.css      plugin styles, using the app's CSS variables
docs/panel.png     README screenshot
```

Keep new calculations in `src/usage.ts` so they can be tested without mounting the UI. Keep the UI in `src/gui.tsx` and use the app's CSS variables instead of hard-coded theme colors.

## Testing the plugin

Automated:

```sh
npm run check
```

Manual checks before a UI pull request:

1. Open and close the panel with the pill and with the **X**.
2. Confirm the three rows show a remaining percentage, a reset countdown and a marker.
3. Hover anywhere on a bar and confirm the tooltip includes the window percentage, the reset and the pace.
4. Resize the window and the sidebar; the footer panel should follow the sidebar and floating panels should stay inside the window.
5. Open **Position** with the sliders button and try every available placement; the pill should pulse after each change.
6. Drag the grip in **Position**; the panel should move, keep its offset after reopening, respond to arrow keys, and return home with **Restore default position**.
7. In top tabs, confirm the sidebar-header option is disabled and the update-button pill uses the tab strip.
8. Confirm the session-header pill sits left of the context controls.
9. Open OpenCode settings while the panel is open; it should close, then reopen on return.
10. Try both light and dark themes, and a display scale of 125% or 150%.
11. Try each interface language: Spanish, English, German, French, Portuguese (Brazil), Italian, Japanese and Simplified Chinese.
12. Simulate a failed request and confirm **Retry** works, then restore the connection.
13. Narrow the sidebar until the longest reset line would wrap; confirm all reset lines hide together and the bar tooltip still shows each reset.
14. Resize below 768 px and try the mobile titlebar at the top and bottom; the pill should stay reachable, the panel should open above a bottom titlebar, **Position** should be hidden, and clicking outside the panel should close it.
15. Open, close and reopen within a minute; the timestamp should continue instead of resetting.

The panel uses the local OpenCode server. Do not include a real workspace ID, token or API key in an issue or a screenshot.

## Adding a translation

Translations live in the `i18n` object in `src/gui.tsx`. Add a locale with every key and keep the `{{placeholders}}` unchanged. Use the app's locale id: `br` is Portuguese (Brazil) and `zh` is Simplified Chinese. The app falls back to English for missing keys. Update the roadmap when a locale is ready.

## Pull requests

- Explain the problem and the chosen fix.
- Update `CHANGELOG.md` under `Unreleased`.
- Add or update tests when the change touches window math or formatting.
- Run `npm run build` and commit the updated `dist/gui-experimental.cjs` with source changes.
- Include before/after screenshots for visible changes.
- Keep unrelated formatting changes out of the diff.

## Releases

Maintainer flow:

1. Update `CHANGELOG.md` and `package.json` version.
2. Run `npm run check`.
3. Commit the release and tag it, for example `v0.1.0`.
4. Push the tag. The release workflow builds the bundle and attaches it to the GitHub release.
5. Update the roadmap if the release closes an item.

## License

MIT. See [LICENSE](LICENSE).
