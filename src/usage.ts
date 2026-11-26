export type WindowKey = "rolling" | "weekly" | "monthly"

export type Pace = "under" | "even" | "over"

export type Placement = "footer" | "header" | "sidebar"

export type EffectivePlacement = Placement | "titlebar"

const HOUR = 60 * 60 * 1_000
const DAY = 24 * HOUR
const PACING_SLACK = 3

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
