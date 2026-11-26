export type WindowKey = "rolling" | "weekly" | "monthly"

export type Pace = "under" | "even" | "over"

export type Placement = "footer" | "header" | "sidebar"

export type EffectivePlacement = Placement | "titlebar"

export type PanelLayout = "side" | "top" | "inbox"

export type PanelOffset = { dx: number; dy: number }

export type BaseAnchor = { left: number; top: number; width: number }

const HOUR = 60 * 60 * 1_000
const DAY = 24 * HOUR
const PACING_SLACK = 3
const PANEL_PAD = 8
const MIN_PANEL_VISIBLE = 80

export function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

export function remainingPercent(percent: number) {
  return clamp(100 - percent, 0, 100)
}

export function startOfWindow(key: WindowKey, resetsAt: number) {
  if (key === "rolling") return resetsAt - 5 * HOUR
  if (key === "weekly") return resetsAt - 7 * DAY

  // The API only exposes resetsAt, so the monthly window start is inferred from it.
  const reset = new Date(resetsAt)
  const start = new Date(resetsAt)
  const day = reset.getUTCDate()
  start.setUTCDate(1)
  start.setUTCMonth(start.getUTCMonth() - 1)
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate()
  start.setUTCDate(Math.min(day, lastDay))
  return start.getTime()
}

export function windowLeft(key: WindowKey, resetsAt: number, now: number) {
  if (!Number.isFinite(resetsAt) || !Number.isFinite(now)) return undefined
  if (resetsAt <= now) return undefined

  const start = startOfWindow(key, resetsAt)
  const total = resetsAt - start
  if (!(total > 0)) return undefined

  return clamp(((resetsAt - now) / total) * 100, 0, 100)
}

export function paceOf(remaining: number, windowLeft: number | undefined): Pace | undefined {
  if (windowLeft === undefined || !Number.isFinite(remaining)) return undefined

  const delta = remaining - windowLeft
  if (delta > PACING_SLACK) return "under"
  if (delta < -PACING_SLACK) return "over"
  return "even"
}

export function cooldownLeft(lastAt: number | undefined, now: number, cooldown: number) {
  if (!lastAt || !Number.isFinite(lastAt) || !Number.isFinite(now) || cooldown <= 0) return 0
  return Math.max(0, cooldown - (now - lastAt))
}

export function offsetKey(placement: Placement, layout: PanelLayout) {
  return `${placement}:${layout}`
}

export const SESSION_HEADER_SELECTOR = [
  ".session-header-layout",
  '[data-slot="session-header"]',
  '[data-slot="session-header-layout"]',
].join(", ")

export function headerRightOf(
  trigger: { closest(selector: string): { getBoundingClientRect(): { right: number } } | null } | null | undefined,
) {
  return trigger?.closest(SESSION_HEADER_SELECTOR)?.getBoundingClientRect().right
}

export function applyOffset(
  base: BaseAnchor,
  offset: PanelOffset | undefined,
  view: { width: number; height: number },
  pad = PANEL_PAD,
) {
  const left = clamp(base.left + (offset?.dx ?? 0), pad, view.width - base.width - pad)
  const top = clamp(base.top + (offset?.dy ?? 0), pad, view.height - pad - MIN_PANEL_VISIBLE)
  return {
    left,
    top,
    width: base.width,
    maxHeight: Math.max(MIN_PANEL_VISIBLE, view.height - top - pad),
  }
}

export function effectivePlacement(
  selected: Placement,
  hasSidebar: boolean,
  hasSession: boolean,
): EffectivePlacement {
  if (selected === "footer") return hasSidebar ? "footer" : "titlebar"
  if (selected === "sidebar") return hasSidebar ? "sidebar" : "titlebar"
  if (selected === "header") return hasSession ? "header" : hasSidebar ? "footer" : "titlebar"
  return "footer"
}
