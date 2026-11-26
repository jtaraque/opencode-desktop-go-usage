import { describe, expect, it } from "vitest"
import { applyOffset, clamp, cooldownLeft, effectivePlacement, headerRightOf, SESSION_HEADER_SELECTOR, offsetKey, paceOf, remainingPercent, startOfWindow, windowLeft } from "./usage"

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

describe("effectivePlacement", () => {
  it("keeps footer and sidebar in sidebar tabs", () => {
    expect(effectivePlacement("footer", true, true)).toBe("footer")
    expect(effectivePlacement("sidebar", true, true)).toBe("sidebar")
  })

  it("keeps the footer at the end of the tab strip in top tabs", () => {
    expect(effectivePlacement("footer", false, true)).toBe("titlebar")
    expect(effectivePlacement("footer", false, false)).toBe("titlebar")
  })

  it("does not use the sidebar header in top tabs", () => {
    expect(effectivePlacement("sidebar", false, true)).toBe("titlebar")
    expect(effectivePlacement("sidebar", false, false)).toBe("titlebar")
  })

  it("falls back to the titlebar without a session", () => {
    expect(effectivePlacement("header", false, false)).toBe("titlebar")
    expect(effectivePlacement("header", true, false)).toBe("footer")
  })

  it("keeps the session header with a session", () => {
    expect(effectivePlacement("header", false, true)).toBe("header")
    expect(effectivePlacement("header", true, true)).toBe("header")
  })
})

describe("offsetKey", () => {
  it("scopes a position by placement and layout", () => {
    expect(offsetKey("header", "inbox")).toBe("header:inbox")
    expect(offsetKey("sidebar", "side")).toBe("sidebar:side")
  })
})

describe("headerRightOf", () => {
  it("finds the session header with class and data-slot fallbacks", () => {
    let seen = ""
    const trigger = {
      closest(selector: string) {
        seen = selector
        return { getBoundingClientRect: () => ({ right: 700 }) }
      },
    }

    expect(headerRightOf(trigger)).toBe(700)
    expect(seen).toContain(".session-header-layout")
    expect(seen).toContain('[data-slot="session-header"]')
    expect(SESSION_HEADER_SELECTOR).toContain('[data-slot="session-header-layout"]')
  })

  it("returns undefined when the trigger or the header is missing", () => {
    expect(headerRightOf(null)).toBeUndefined()
    expect(headerRightOf({ closest: () => null })).toBeUndefined()
  })
})

describe("applyOffset", () => {
  const base = { left: 100, top: 100, width: 320 }
  const view = { width: 1_200, height: 800 }

  it("keeps the default position without an offset", () => {
    expect(applyOffset(base, undefined, view)).toEqual({
      left: 100,
      top: 100,
      width: 320,
      maxHeight: 692,
    })
  })

  it("moves the panel and clamps it to the viewport", () => {
    expect(applyOffset(base, { dx: 20, dy: 30 }, view)).toEqual({
      left: 120,
      top: 130,
      width: 320,
      maxHeight: 662,
    })
    expect(applyOffset(base, { dx: -500, dy: -500 }, view)).toEqual({
      left: 8,
      top: 8,
      width: 320,
      maxHeight: 784,
    })
    expect(applyOffset(base, { dx: 2_000, dy: 2_000 }, view)).toEqual({
      left: 872,
      top: 712,
      width: 320,
      maxHeight: 80,
    })
  })

  it("keeps a narrow viewport usable", () => {
    expect(applyOffset({ left: 20, top: 40, width: 320 }, { dx: 100, dy: 1_000 }, { width: 360, height: 640 })).toEqual({
      left: 32,
      top: 552,
      width: 320,
      maxHeight: 80,
    })
  })
})
