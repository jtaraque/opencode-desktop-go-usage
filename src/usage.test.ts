import { describe, expect, it } from "vitest"
import { clamp, cooldownLeft, paceOf, remainingPercent, startOfWindow, windowLeft } from "./usage"

const HOUR = 60 * 60 * 1_000
const DAY = 24 * HOUR

describe("remainingPercent", () => {
  it("turns the used percentage into what is left", () => {
    expect(remainingPercent(2)).toBe(98)
    expect(remainingPercent(100)).toBe(0)
  })

  it("clamps values outside 0–100", () => {
    expect(remainingPercent(-10)).toBe(100)
    expect(remainingPercent(150)).toBe(0)
  })

  it("treats an invalid percentage as exhausted", () => {
    expect(remainingPercent(Number.NaN)).toBe(0)
  })
})

describe("clamp", () => {
  it("bounds values", () => {
    expect(clamp(-1, 0, 100)).toBe(0)
    expect(clamp(101, 0, 100)).toBe(100)
    expect(clamp(50, 0, 100)).toBe(50)
  })

  it("falls back to the minimum for invalid numbers", () => {
    expect(clamp(Number.NaN, 0, 100)).toBe(0)
  })
})

describe("startOfWindow", () => {
  it("uses fixed windows for rolling and weekly", () => {
    const reset = Date.UTC(2026, 5, 1)
    expect(startOfWindow("rolling", reset)).toBe(reset - 5 * HOUR)
    expect(startOfWindow("weekly", reset)).toBe(reset - 7 * DAY)
  })

  it("clamps a monthly start to the previous month's last day", () => {
    expect(startOfWindow("monthly", Date.UTC(2026, 2, 31))).toBe(Date.UTC(2026, 1, 28))
    expect(startOfWindow("monthly", Date.UTC(2026, 0, 31))).toBe(Date.UTC(2025, 11, 31))
  })

  it("handles leap years", () => {
    expect(startOfWindow("monthly", Date.UTC(2024, 2, 31))).toBe(Date.UTC(2024, 1, 29))
  })
})

describe("windowLeft", () => {
  const now = Date.UTC(2026, 0, 1)

  it("reports the remaining share of the rolling window", () => {
    expect(windowLeft("rolling", now + 2 * HOUR, now)).toBeCloseTo(40)
  })

  it("reports the remaining share of the weekly window", () => {
    expect(windowLeft("weekly", now + 3 * DAY, now)).toBeCloseTo((3 / 7) * 100)
  })

  it("reports the remaining share of the monthly window", () => {
    const reset = Date.UTC(2026, 2, 31)
    const monthNow = Date.UTC(2026, 2, 1)
    expect(windowLeft("monthly", reset, monthNow)).toBeCloseTo((30 / 31) * 100)
  })

  it("hides the marker when the window already reset", () => {
    expect(windowLeft("rolling", now, now)).toBeUndefined()
    expect(windowLeft("rolling", now - 1, now)).toBeUndefined()
  })

  it("hides the marker for invalid timestamps", () => {
    expect(windowLeft("rolling", Number.NaN, now)).toBeUndefined()
    expect(windowLeft("rolling", now + HOUR, Number.NaN)).toBeUndefined()
  })
})

describe("paceOf", () => {
  it("compares remaining allowance with remaining time", () => {
    expect(paceOf(98, 42)).toBe("under")
    expect(paceOf(42, 42)).toBe("even")
    expect(paceOf(30, 42)).toBe("over")
  })

  it("uses a three-point slack", () => {
    expect(paceOf(45, 42)).toBe("even")
    expect(paceOf(46, 42)).toBe("under")
    expect(paceOf(39, 42)).toBe("even")
    expect(paceOf(38, 42)).toBe("over")
  })

  it("has no pace without a live window", () => {
    expect(paceOf(98, undefined)).toBeUndefined()
    expect(paceOf(Number.NaN, 42)).toBeUndefined()
  })
})

describe("cooldownLeft", () => {
  const now = 1_000_000

  it("has no wait before the first request", () => {
    expect(cooldownLeft(undefined, now, 30_000)).toBe(0)
  })

  it("counts down from the last request", () => {
    expect(cooldownLeft(now - 10_000, now, 30_000)).toBe(20_000)
    expect(cooldownLeft(now - 30_000, now, 30_000)).toBe(0)
    expect(cooldownLeft(now - 10_000, now, 60_000)).toBe(50_000)
  })

  it("ignores invalid timestamps", () => {
    expect(cooldownLeft(Number.NaN, now, 30_000)).toBe(0)
    expect(cooldownLeft(now - 10_000, Number.NaN, 30_000)).toBe(0)
  })
})
