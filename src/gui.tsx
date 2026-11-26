import { createEffect, createMemo, createSignal, For, onCleanup, Show, untrack, type Accessor } from "solid-js"
import { Portal } from "solid-js/web"
import { Plugin, Slot, Style, TitlebarItem, usePlugin, type Params } from "@opencode/plugin/gui"
import { clamp, cooldownLeft, paceOf, remainingPercent, windowLeft, type WindowKey } from "./usage"
import gauge from "./icons/gauge.svg?raw"
import css from "./style.css?inline"

type Meter = {
  percent: number
  limited: boolean
  resetsAt: number
}

type Limits = {
  workspace: { id: string; name?: string; usageURL: string }
  go?: {
    rolling: Meter
    weekly: Meter
    monthly: Meter
  }
}

type Anchor = {
  left: number
  width: number
  bottom: number
  maxHeight: number
}

const OPEN_COOLDOWN = 60_000
const AUTO_COOLDOWN = 5 * 60_000
const MANUAL_COOLDOWN = 60_000

const definition = Plugin.define({
  icons: { gauge },
  i18n: {
    es: {
      "pill.label": "Uso de Go",
      "pill.title": "Uso de OpenCode Go",
      "panel.title": "OpenCode Go",
      "panel.workspace": "Workspace",
      "window.rolling": "5 horas",
      "window.weekly": "Semanal",
      "window.monthly": "Mensual",
      "row.remaining": "{{percent}}% restante",
      "row.reset": "Reset en {{duration}} · {{time}}",
      "row.resetNow": "Reset ahora",
      "row.limited": "Límite alcanzado",
      "row.windowLeft": "Queda {{percent}}% de la ventana · reset en {{duration}} · {{pace}}",
      "pace.under": "Con margen",
      "pace.over": "Por encima del ritmo",
      "pace.even": "En ritmo",
      "loading": "Cargando…",
      "error": "No se pudo cargar el uso.",
      "error.stale": "No se pudo actualizar.",
      "retry": "Reintentar",
      "empty.title": "No hay una suscripción Go conectada",
      "empty.body": "Conecta OpenCode Go para ver el uso.",
      "empty.console": "Abrir consola",
      "footer.now": "Ahora mismo",
      "footer.agoMinutes": "hace {{count}} min",
      "footer.refresh": "Actualizar",
      "footer.refreshing": "Actualizando…",
      "footer.refreshIn": "Disponible en {{seconds}} s",
      "footer.console": "Consola ↗",
      "close": "Cerrar",
      "duration.days": "{{days}} d {{hours}} h",
      "duration.hours": "{{hours}} h {{minutes}} min",
      "duration.minutes": "{{minutes}} min",
    },
    en: {
      "pill.label": "Go usage",
      "pill.title": "OpenCode Go usage",
      "panel.title": "OpenCode Go",
      "panel.workspace": "Workspace",
      "window.rolling": "5 hours",
      "window.weekly": "Weekly",
      "window.monthly": "Monthly",
      "row.remaining": "{{percent}}% left",
      "row.reset": "Resets in {{duration}} · {{time}}",
      "row.resetNow": "Resetting now",
      "row.limited": "Limit reached",
      "row.windowLeft": "{{percent}}% of the window left · reset in {{duration}} · {{pace}}",
      "pace.under": "Under pace",
      "pace.over": "Over pace",
      "pace.even": "On pace",
      "loading": "Loading…",
      "error": "Could not load usage.",
      "error.stale": "Could not refresh.",
      "retry": "Retry",
      "empty.title": "No Go subscription connected",
      "empty.body": "Connect OpenCode Go to see usage.",
      "empty.console": "Open console",
      "footer.now": "Just now",
      "footer.agoMinutes": "{{count}}m ago",
      "footer.refresh": "Refresh",
      "footer.refreshing": "Refreshing…",
      "footer.refreshIn": "Available in {{seconds}}s",
      "footer.console": "Console ↗",
      "close": "Close",
      "duration.days": "{{days}}d {{hours}}h",
      "duration.hours": "{{hours}}h {{minutes}}m",
      "duration.minutes": "{{minutes}}m",
    },
  },
})

const WINDOWS: { key: WindowKey; label: string }[] = [
  { key: "rolling", label: "window.rolling" },
  { key: "weekly", label: "window.weekly" },
  { key: "monthly", label: "window.monthly" },
]

function clock(ms: number) {
  const date = new Date(ms)
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  return new Intl.DateTimeFormat(undefined, sameDay
    ? { hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date)
}

function fullDate(ms: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms))
}

function findPill(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-slot="titlebar-update"] button'))
    .find((button) => button.getAttribute("aria-label") === label)
}

type Translate = (key: string, params?: Params) => string

function durationText(t: Translate, ms: number) {
  const minutes = Math.max(0, Math.ceil(ms / 60_000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  if (days > 0) return t("duration.days", { days, hours })
  if (hours > 0) return t("duration.hours", { hours, minutes: minutes % 60 })
  return t("duration.minutes", { minutes })
}

function resetText(t: Translate, meter: Meter, now: number) {
  const resetIn = meter.resetsAt - now
  if (resetIn <= 0) return t("row.resetNow")
  return t("row.reset", { duration: durationText(t, resetIn), time: clock(meter.resetsAt) })
}

function UsageRow(props: {
  window: WindowKey
  label: string
  meter: Meter
  now: Accessor<number>
  hideResets: Accessor<boolean>
}) {
  const ctx = usePlugin<typeof definition>()

  const remaining = () => remainingPercent(props.meter.percent)
  const left = () => windowLeft(props.window, props.meter.resetsAt, props.now())
  const resetIn = () => props.meter.resetsAt - props.now()

  const pace = () => {
    const value = paceOf(remaining(), left())
    if (value === "under") return ctx.t("pace.under")
    if (value === "over") return ctx.t("pace.over")
    if (value === "even") return ctx.t("pace.even")
    return undefined
  }

  const trackTitle = () => {
    const window = left()
    if (window === undefined) return ctx.t("row.remaining", { percent: Math.round(remaining()) })
    return ctx.t("row.windowLeft", {
      percent: Math.round(window),
      duration: resetIn() > 0 ? durationText(ctx.t, resetIn()) : ctx.t("row.resetNow"),
      pace: pace() ?? ctx.t("pace.even"),
    })
  }

  return (
    <div class="ogu-row">
      <div class="ogu-row-head">
        <span class="ogu-label">{props.label}</span>
        <span class="ogu-value">{ctx.t("row.remaining", { percent: Math.round(remaining()) })}</span>
      </div>
      <div class="ogu-subline">
        <span
          class="ogu-reset"
          classList={{ "ogu-reset-hidden": props.hideResets() }}
          title={fullDate(props.meter.resetsAt)}
        >
          {resetText(ctx.t, props.meter, props.now())}
        </span>
        <Show when={props.meter.limited}>
          <span class="ogu-badge">{ctx.t("row.limited")}</span>
        </Show>
      </div>
      <div
        class="ogu-track"
        role="img"
        aria-label={trackTitle()}
        title={trackTitle()}
      >
        <div
          class="ogu-fill"
          classList={{ "ogu-fill-low": remaining() <= 10 }}
          style={`width:${remaining()}%`}
        />
        <Show when={left() !== undefined}>
          <div
            class="ogu-marker"
            style={`left:${clamp(left()!, 0.5, 99.5)}%`}
          />
        </Show>
      </div>
    </div>
  )
}

function UsagePanel(props: { open: Accessor<boolean>; onClose: () => void }) {
  const ctx = usePlugin<typeof definition>()
  const [limits, setLimits] = createSignal<Limits | null | undefined>(undefined)
  const [error, setError] = createSignal<string>()
  const [loading, setLoading] = createSignal(false)
  const [updatedAt, setUpdatedAt] = createSignal<number>()
  const [now, setNow] = createSignal(Date.now())
  const [anchor, setAnchor] = createSignal<Anchor>()
  const [lastRequestAt, setLastRequestAt] = createSignal<number>()
  const [hideResets, setHideResets] = createSignal(false)

  let panel: HTMLDivElement | undefined
  let samples: HTMLDivElement | undefined
  let frame = 0
  let disposed = false
  let request = 0

  const load = async (mode: "open" | "auto" | "manual") => {
    if (loading()) return

    const cooldown = mode === "manual" ? MANUAL_COOLDOWN : mode === "auto" ? AUTO_COOLDOWN : OPEN_COOLDOWN
    if (cooldownLeft(lastRequestAt(), Date.now(), cooldown) > 0) return

    const id = ++request
    setLoading(true)
    try {
      const response = await ctx.client.experimental.usage.limits()
      if (disposed || id !== request) return
      setLimits(response.data ?? null)
      setError(undefined)
      setUpdatedAt(Date.now())
    } catch (cause) {
      if (disposed || id !== request) return
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      if (!disposed && id === request) {
        setLastRequestAt(Date.now())
        setLoading(false)
      }
    }
  }

  onCleanup(() => {
    disposed = true
  })

  createEffect(() => {
    if (!props.open()) return

    setNow(Date.now())
    untrack(() => void load("open"))

    const tick = window.setInterval(() => {
      const at = Date.now()
      setNow(at)
      if (!loading()) {
        const last = lastRequestAt()
        if (!last || at - last >= AUTO_COOLDOWN) void load("auto")
      }
    }, 1_000)

    onCleanup(() => {
      window.clearInterval(tick)
    })
  })

  const measure = () => {
    const sidebar = document.querySelector<HTMLElement>('aside[data-slot="vertical-tabs-sidebar"]')
    const pill = findPill(ctx.t("pill.title"))
    if (!sidebar || !pill) {
      setAnchor(undefined)
      return
    }

    const box = sidebar.getBoundingClientRect()
    const button = pill.getBoundingClientRect()
    const pad = 8
    const width = box.width - pad * 2
    const height = button.top - pad * 2

    if (width < 120 || height < 80 || button.width === 0 || button.height === 0) {
      setAnchor(undefined)
      return
    }

    setAnchor({
      left: box.left + pad,
      width,
      bottom: Math.max(pad, window.innerHeight - button.top + pad),
      maxHeight: height,
    })
  }

  const scheduleMeasure = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(measure)
  }

  createEffect(() => {
    if (!props.open()) {
      setAnchor(undefined)
      return
    }

    scheduleMeasure()
    window.addEventListener("resize", scheduleMeasure)

    const sidebar = document.querySelector<HTMLElement>('aside[data-slot="vertical-tabs-sidebar"]')
    const observer = new ResizeObserver(scheduleMeasure)
    if (sidebar) observer.observe(sidebar)
    const pill = findPill(ctx.t("pill.title"))
    if (pill) observer.observe(pill)

    const focus = requestAnimationFrame(() => panel?.focus({ preventScroll: true }))

    onCleanup(() => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(focus)
      window.removeEventListener("resize", scheduleMeasure)
      observer.disconnect()
    })
  })

  const rows = createMemo(() => {
    const go = limits()?.go
    if (!go) return []
    return WINDOWS.map((item) => ({
      window: item.key,
      label: ctx.t(item.label),
      meter: go[item.key],
    }))
  })

  const resetTexts = createMemo(() => rows().map((row) => resetText(ctx.t, row.meter, now())))

  const measureResets = () => {
    if (!samples) return
    const panelWidth = anchor()?.width
    if (panelWidth === undefined) return

    const widest = Array.from(samples.children)
      .reduce((max, element) => Math.max(max, element.getBoundingClientRect().width), 0)
    const padding = panelWidth <= 220 ? 10 : 12
    const content = Math.max(0, panelWidth - 2 - padding * 2)

    setHideResets(widest > content)
  }

  createEffect(() => {
    resetTexts()
    anchor()
    const id = requestAnimationFrame(measureResets)
    onCleanup(() => cancelAnimationFrame(id))
  })

  const ago = () => {
    const updated = updatedAt()
    if (!updated) return undefined
    const seconds = Math.max(0, Math.floor((now() - updated) / 1000))
    if (seconds < 60) return ctx.t("footer.now")
    return ctx.t("footer.agoMinutes", { count: Math.floor(seconds / 60) })
  }

  const refreshIn = () => Math.ceil(cooldownLeft(lastRequestAt(), now(), MANUAL_COOLDOWN) / 1_000)
  const refreshDisabled = () => loading() || refreshIn() > 0
  const refreshTitle = () => loading()
    ? ctx.t("footer.refreshing")
    : refreshIn() > 0
      ? ctx.t("footer.refreshIn", { seconds: refreshIn() })
      : ctx.t("footer.refresh")

  const openConsole = () => {
    ctx.system.openExternal(limits()?.workspace.usageURL ?? "https://opencode.ai/console")
  }

  return (
    <Show when={props.open() && anchor()}>
      <Portal>
        <div
          ref={(element) => (panel = element)}
          class="ogu-panel"
          role="dialog"
          aria-modal="false"
          aria-label={ctx.t("pill.title")}
          tabindex="-1"
          style={anchor()
            ? `left:${anchor()!.left}px;width:${anchor()!.width}px;bottom:${anchor()!.bottom}px;max-height:${anchor()!.maxHeight}px`
            : undefined}
        >
          <div class="ogu-head">
            <div style={{ "min-width": 0, flex: 1 }}>
              <div class="ogu-title">{ctx.t("panel.title")}</div>
              <Show when={limits()}>
                <div class="ogu-sub">
                  {limits()!.workspace.name || ctx.t("panel.workspace")}
                  <Show when={ago()}> · {ago()}</Show>
                </div>
              </Show>
            </div>
            <button
              type="button"
              class="ogu-close"
              aria-label={ctx.t("close")}
              title={ctx.t("close")}
              onClick={props.onClose}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M3.5 3.5 10.5 10.5M10.5 3.5 3.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <div class="ogu-body">
            <Show when={limits() === undefined && !error()}>
              <div class="ogu-note">{ctx.t("loading")}</div>
            </Show>

            <Show when={!!error() && limits() === undefined}>
              <div class="ogu-note" title={error()}>
                {ctx.t("error")}
                <div class="ogu-note-actions">
                  <button
                    type="button"
                    class="ogu-btn"
                    disabled={refreshDisabled()}
                    title={refreshTitle()}
                    onClick={() => void load("manual")}
                  >
                    {ctx.t("retry")}
                  </button>
                </div>
              </div>
            </Show>

            <Show when={limits() === null}>
              <div class="ogu-note">
                <div style={{ "font-weight": 600 }}>{ctx.t("empty.title")}</div>
                <div style={{ "margin-top": "2px" }}>{ctx.t("empty.body")}</div>
                <div class="ogu-note-actions">
                  <button type="button" class="ogu-btn" onClick={openConsole}>
                    {ctx.t("empty.console")}
                  </button>
                </div>
              </div>
            </Show>

            <Show when={!!error() && limits()}>
              <div class="ogu-subline" style={{ "padding-top": "8px" }}>
                {ctx.t("error.stale")}
              </div>
            </Show>

            <Show when={limits()?.go}>
              <For each={rows()}>
                {(row) => (
                  <UsageRow window={row.window} label={row.label} meter={row.meter} now={now} hideResets={hideResets} />
                )}
              </For>
            </Show>
          </div>

          <Show when={limits()}>
            <div class="ogu-foot">
              <div class="ogu-foot-actions">
                <button
                  type="button"
                  class="ogu-btn"
                  disabled={refreshDisabled()}
                  onClick={() => void load("manual")}
                  title={refreshTitle()}
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M12 7a5 5 0 1 1-1.5-3.5M12 2v3H9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  {ctx.t("footer.refresh")}
                </button>
                <button type="button" class="ogu-btn" onClick={openConsole}>
                  {ctx.t("footer.console")}
                </button>
              </div>
            </div>
          </Show>

          <div ref={(element) => (samples = element)} class="ogu-reset-samples" aria-hidden="true">
            <For each={resetTexts()}>{(text) => <span class="ogu-reset-sample">{text}</span>}</For>
          </div>
        </div>
      </Portal>
    </Show>
  )
}

export default Plugin.define({
  ...definition,
  setup(ctx) {
    const [open, setOpen] = createSignal(false)

    const close = () => {
      setOpen(false)
      queueMicrotask(() => findPill(ctx.t("pill.title"))?.focus())
    }

    ctx.add(Style, css)

    ctx.add(TitlebarItem, () => ({
      id: "usage",
      label: ctx.t("pill.label"),
      title: ctx.t("pill.title"),
      icon: ctx.icons.gauge,
      pressed: open(),
      run: () => (open() ? close() : setOpen(true)),
    }))

    ctx.add(Slot, {
      at: "window.bottom",
      render: () => <UsagePanel open={open} onClose={close} />,
    })
  },
})
