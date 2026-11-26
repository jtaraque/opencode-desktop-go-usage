import { createEffect, createMemo, createSignal, For, onCleanup, Show, untrack, type Accessor } from "solid-js"
import { Portal } from "solid-js/web"
import { Plugin, Slot, Store, Style, TitlebarItem, usePlugin, type Params } from "@opencode/plugin/gui"
import { Schema } from "effect"
import { applyOffset, clamp, cooldownLeft, effectivePlacement, headerRightOf, offsetKey, paceOf, remainingPercent, windowLeft, type BaseAnchor, type EffectivePlacement, type PanelLayout, type PanelOffset, type Placement, type WindowKey } from "./usage"
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
  top?: number
  bottom?: number
  maxHeight: number
}

const PLACEMENTS: { id: Placement; label: string; description: string }[] = [
  { id: "footer", label: "settings.footer.label", description: "settings.footer.description" },
  { id: "header", label: "settings.header.label", description: "settings.header.description" },
  { id: "sidebar", label: "settings.sidebar.label", description: "settings.sidebar.description" },
]

const OPEN_COOLDOWN = 60_000
const AUTO_COOLDOWN = 5 * 60_000
const MANUAL_COOLDOWN = 60_000


const PANEL_OFFSET = Schema.Struct({ dx: Schema.Number, dy: Schema.Number })

const definition = Plugin.define({
  icons: { gauge },
  stores: {
    prefs: Store.global(
      Schema.Struct({
        placement: Schema.Literals(["footer", "header", "sidebar"]),
        offsets: Schema.optional(Schema.Record(Schema.String, PANEL_OFFSET)),
      }),
      { placement: "footer", offsets: {} },
    ),
  },
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
      "settings.open": "Ajustes de posición",
      "settings.title": "Posición",
      "settings.description": "Elige dónde aparece el pill.",
      "settings.saved": "Posición actualizada",
      "settings.drag": "Arrastrar panel",
      "settings.reset": "Restablecer posición",
      "settings.resetDone": "Posición restablecida",
      "settings.footer.label": "Junto a actualizar",
      "settings.footer.description": "El mismo hueco que el botón de actualizar: pie de la barra lateral en pestañas laterales, final de las pestañas en top tabs.",
      "settings.header.label": "Cabecera de sesión",
      "settings.header.description": "Junto a los controles de contexto.",
      "settings.sidebar.label": "Cabecera de la barra lateral",
      "settings.sidebar.description": "Junto al botón de barra lateral.",
      "settings.unavailable": "No disponible en este diseño.",
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
      "settings.open": "Position settings",
      "settings.title": "Position",
      "settings.description": "Choose where the pill appears.",
      "settings.saved": "Position updated",
      "settings.drag": "Drag panel",
      "settings.reset": "Restore default position",
      "settings.resetDone": "Position reset",
      "settings.footer.label": "Next to update",
      "settings.footer.description": "The same slot as the update button: sidebar footer in side tabs, end of the tab strip in top tabs.",
      "settings.header.label": "Session header",
      "settings.header.description": "Next to the context controls.",
      "settings.sidebar.label": "Sidebar header",
      "settings.sidebar.description": "Next to the sidebar toggle.",
      "settings.unavailable": "Not available in this layout.",
      "duration.days": "{{days}}d {{hours}}h",
      "duration.hours": "{{hours}}h {{minutes}}m",
      "duration.minutes": "{{minutes}}m",
    },
    // The desktop app uses short locale ids; `br` is Portuguese (Brazil).
    de: {
      "pill.label": "Go-Nutzung",
      "pill.title": "OpenCode Go-Nutzung",
      "panel.title": "OpenCode Go",
      "panel.workspace": "Arbeitsbereich",
      "window.rolling": "5 Stunden",
      "window.weekly": "Wöchentlich",
      "window.monthly": "Monatlich",
      "row.remaining": "{{percent}} % übrig",
      "row.reset": "Zurücksetzung in {{duration}} · {{time}}",
      "row.resetNow": "Wird jetzt zurückgesetzt",
      "row.limited": "Limit erreicht",
      "row.windowLeft": "{{percent}} % des Zeitfensters übrig · Zurücksetzung in {{duration}} · {{pace}}",
      "pace.under": "Unter dem Tempo",
      "pace.over": "Über dem Tempo",
      "pace.even": "Im Tempo",
      "loading": "Wird geladen…",
      "error": "Nutzung konnte nicht geladen werden.",
      "error.stale": "Aktualisierung fehlgeschlagen.",
      "retry": "Erneut versuchen",
      "empty.title": "Kein Go-Abo verbunden",
      "empty.body": "OpenCode Go verbinden, um die Nutzung zu sehen.",
      "empty.console": "Konsole öffnen",
      "footer.now": "Gerade eben",
      "footer.agoMinutes": "vor {{count}} Min.",
      "footer.refresh": "Aktualisieren",
      "footer.refreshing": "Wird aktualisiert…",
      "footer.refreshIn": "Verfügbar in {{seconds}} s",
      "footer.console": "Konsole ↗",
      "close": "Schließen",
      "settings.open": "Positionseinstellungen",
      "settings.title": "Position",
      "settings.description": "Bestimmt, wo die Anzeige erscheint.",
      "settings.saved": "Position aktualisiert",
      "settings.drag": "Panel verschieben",
      "settings.reset": "Standardposition wiederherstellen",
      "settings.resetDone": "Position zurückgesetzt",
      "settings.footer.label": "Neben Aktualisieren",
      "settings.footer.description": "Derselbe Platz wie die Schaltfläche „Aktualisieren“: Fuß der Seitenleiste bei seitlichen Tabs, Ende der Tab-Leiste bei oberen Tabs.",
      "settings.header.label": "Sitzungskopf",
      "settings.header.description": "Neben den Kontext-Steuerelementen.",
      "settings.sidebar.label": "Seitenleisten-Kopf",
      "settings.sidebar.description": "Neben dem Seitenleisten-Schalter.",
      "settings.unavailable": "In diesem Layout nicht verfügbar.",
      "duration.days": "{{days}} T {{hours}} Std.",
      "duration.hours": "{{hours}} Std. {{minutes}} Min.",
      "duration.minutes": "{{minutes}} Min.",
    },
    fr: {
      "pill.label": "Utilisation Go",
      "pill.title": "Utilisation d’OpenCode Go",
      "panel.title": "OpenCode Go",
      "panel.workspace": "Espace de travail",
      "window.rolling": "5 heures",
      "window.weekly": "Hebdomadaire",
      "window.monthly": "Mensuel",
      "row.remaining": "{{percent}} % restant",
      "row.reset": "Réinitialisation dans {{duration}} · {{time}}",
      "row.resetNow": "Réinitialisation en cours",
      "row.limited": "Limite atteinte",
      "row.windowLeft": "{{percent}} % de la fenêtre restant · réinitialisation dans {{duration}} · {{pace}}",
      "pace.under": "Sous le rythme",
      "pace.over": "Au-dessus du rythme",
      "pace.even": "Au rythme",
      "loading": "Chargement…",
      "error": "Impossible de charger l’utilisation.",
      "error.stale": "Impossible d’actualiser.",
      "retry": "Réessayer",
      "empty.title": "Aucun abonnement Go connecté",
      "empty.body": "Connectez OpenCode Go pour voir l’utilisation.",
      "empty.console": "Ouvrir la console",
      "footer.now": "À l’instant",
      "footer.agoMinutes": "il y a {{count}} min",
      "footer.refresh": "Actualiser",
      "footer.refreshing": "Actualisation…",
      "footer.refreshIn": "Disponible dans {{seconds}} s",
      "footer.console": "Console ↗",
      "close": "Fermer",
      "settings.open": "Paramètres de position",
      "settings.title": "Position",
      "settings.description": "Choisissez où apparaît la pastille.",
      "settings.saved": "Position mise à jour",
      "settings.drag": "Déplacer le panneau",
      "settings.reset": "Rétablir la position par défaut",
      "settings.resetDone": "Position réinitialisée",
      "settings.footer.label": "À côté d’Actualiser",
      "settings.footer.description": "Le même emplacement que le bouton Actualiser : pied de la barre latérale en onglets latéraux, fin de la barre d’onglets en onglets supérieurs.",
      "settings.header.label": "En-tête de session",
      "settings.header.description": "À côté des contrôles de contexte.",
      "settings.sidebar.label": "En-tête de la barre latérale",
      "settings.sidebar.description": "À côté du bouton de barre latérale.",
      "settings.unavailable": "Non disponible dans cette disposition.",
      "duration.days": "{{days}} j {{hours}} h",
      "duration.hours": "{{hours}} h {{minutes}} min",
      "duration.minutes": "{{minutes}} min",
    },
    br: {
      "pill.label": "Uso do Go",
      "pill.title": "Uso do OpenCode Go",
      "panel.title": "OpenCode Go",
      "panel.workspace": "Área de trabalho",
      "window.rolling": "5 horas",
      "window.weekly": "Semanal",
      "window.monthly": "Mensal",
      "row.remaining": "{{percent}}% restante",
      "row.reset": "Reinicia em {{duration}} · {{time}}",
      "row.resetNow": "Reiniciando agora",
      "row.limited": "Limite atingido",
      "row.windowLeft": "{{percent}}% da janela restante · reinicia em {{duration}} · {{pace}}",
      "pace.under": "Abaixo do ritmo",
      "pace.over": "Acima do ritmo",
      "pace.even": "No ritmo",
      "loading": "Carregando…",
      "error": "Não foi possível carregar o uso.",
      "error.stale": "Não foi possível atualizar.",
      "retry": "Tentar novamente",
      "empty.title": "Nenhuma assinatura Go conectada",
      "empty.body": "Conecte o OpenCode Go para ver o uso.",
      "empty.console": "Abrir console",
      "footer.now": "Agora mesmo",
      "footer.agoMinutes": "há {{count}} min",
      "footer.refresh": "Atualizar",
      "footer.refreshing": "Atualizando…",
      "footer.refreshIn": "Disponível em {{seconds}} s",
      "footer.console": "Console ↗",
      "close": "Fechar",
      "settings.open": "Configurações de posição",
      "settings.title": "Posição",
      "settings.description": "Escolha onde o indicador aparece.",
      "settings.saved": "Posição atualizada",
      "settings.drag": "Mover painel",
      "settings.reset": "Restaurar posição padrão",
      "settings.resetDone": "Posição restaurada",
      "settings.footer.label": "Ao lado de Atualizar",
      "settings.footer.description": "O mesmo espaço do botão Atualizar: rodapé da barra lateral em abas laterais, fim da barra de abas em abas superiores.",
      "settings.header.label": "Cabeçalho da sessão",
      "settings.header.description": "Ao lado dos controles de contexto.",
      "settings.sidebar.label": "Cabeçalho da barra lateral",
      "settings.sidebar.description": "Ao lado do botão da barra lateral.",
      "settings.unavailable": "Não disponível neste layout.",
      "duration.days": "{{days}} d {{hours}} h",
      "duration.hours": "{{hours}} h {{minutes}} min",
      "duration.minutes": "{{minutes}} min",
    },
    it: {
      "pill.label": "Utilizzo Go",
      "pill.title": "Utilizzo di OpenCode Go",
      "panel.title": "OpenCode Go",
      "panel.workspace": "Area di lavoro",
      "window.rolling": "5 ore",
      "window.weekly": "Settimanale",
      "window.monthly": "Mensile",
      "row.remaining": "{{percent}}% rimanente",
      "row.reset": "Ripristino tra {{duration}} · {{time}}",
      "row.resetNow": "Ripristino in corso",
      "row.limited": "Limite raggiunto",
      "row.windowLeft": "{{percent}}% della finestra rimanente · ripristino tra {{duration}} · {{pace}}",
      "pace.under": "Sotto il ritmo",
      "pace.over": "Sopra il ritmo",
      "pace.even": "In linea",
      "loading": "Caricamento…",
      "error": "Impossibile caricare l’utilizzo.",
      "error.stale": "Impossibile aggiornare.",
      "retry": "Riprova",
      "empty.title": "Nessun abbonamento Go connesso",
      "empty.body": "Connetti OpenCode Go per vedere l’utilizzo.",
      "empty.console": "Apri console",
      "footer.now": "Adesso",
      "footer.agoMinutes": "{{count}} min fa",
      "footer.refresh": "Aggiorna",
      "footer.refreshing": "Aggiornamento…",
      "footer.refreshIn": "Disponibile tra {{seconds}} s",
      "footer.console": "Console ↗",
      "close": "Chiudi",
      "settings.open": "Impostazioni posizione",
      "settings.title": "Posizione",
      "settings.description": "Scegli dove appare l’indicatore.",
      "settings.saved": "Posizione aggiornata",
      "settings.drag": "Sposta pannello",
      "settings.reset": "Ripristina posizione predefinita",
      "settings.resetDone": "Posizione ripristinata",
      "settings.footer.label": "Accanto ad Aggiorna",
      "settings.footer.description": "Lo stesso spazio del pulsante Aggiorna: piè di pagina della barra laterale nelle schede laterali, fine della barra delle schede nelle schede superiori.",
      "settings.header.label": "Intestazione sessione",
      "settings.header.description": "Accanto ai controlli di contesto.",
      "settings.sidebar.label": "Intestazione barra laterale",
      "settings.sidebar.description": "Accanto al pulsante della barra laterale.",
      "settings.unavailable": "Non disponibile in questo layout.",
      "duration.days": "{{days}} g {{hours}} h",
      "duration.hours": "{{hours}} h {{minutes}} min",
      "duration.minutes": "{{minutes}} min",
    },
    ja: {
      "pill.label": "Go 使用量",
      "pill.title": "OpenCode Go の使用量",
      "panel.title": "OpenCode Go",
      "panel.workspace": "ワークスペース",
      "window.rolling": "5時間",
      "window.weekly": "週間",
      "window.monthly": "月間",
      "row.remaining": "残り {{percent}}%",
      "row.reset": "{{duration}}後にリセット · {{time}}",
      "row.resetNow": "まもなくリセット",
      "row.limited": "上限に達しました",
      "row.windowLeft": "期間の残り {{percent}}% · {{duration}}後にリセット · {{pace}}",
      "pace.under": "ペースを下回っています",
      "pace.over": "ペースを上回っています",
      "pace.even": "ペースどおり",
      "loading": "読み込み中…",
      "error": "使用量を読み込めませんでした。",
      "error.stale": "更新できませんでした。",
      "retry": "再試行",
      "empty.title": "Go サブスクリプションが接続されていません",
      "empty.body": "OpenCode Go を接続すると使用量が表示されます。",
      "empty.console": "コンソールを開く",
      "footer.now": "たった今",
      "footer.agoMinutes": "{{count}}分前",
      "footer.refresh": "更新",
      "footer.refreshing": "更新中…",
      "footer.refreshIn": "{{seconds}}秒後に利用可能",
      "footer.console": "コンソール ↗",
      "close": "閉じる",
      "settings.open": "位置設定",
      "settings.title": "位置",
      "settings.description": "表示位置を選択してください。",
      "settings.saved": "位置を更新しました",
      "settings.drag": "パネルを移動",
      "settings.reset": "既定の位置に戻す",
      "settings.resetDone": "位置をリセットしました",
      "settings.footer.label": "更新の隣",
      "settings.footer.description": "更新ボタンと同じ場所: サイドタブではサイドバーの下部、上部タブではタブバーの末尾。",
      "settings.header.label": "セッションヘッダー",
      "settings.header.description": "コンテキストコントロールの隣。",
      "settings.sidebar.label": "サイドバーヘッダー",
      "settings.sidebar.description": "サイドバー切り替えの隣。",
      "settings.unavailable": "このレイアウトでは利用できません。",
      "duration.days": "{{days}}日 {{hours}}時間",
      "duration.hours": "{{hours}}時間{{minutes}}分",
      "duration.minutes": "{{minutes}}分",
    },
    zh: {
      "pill.label": "Go 用量",
      "pill.title": "OpenCode Go 用量",
      "panel.title": "OpenCode Go",
      "panel.workspace": "工作区",
      "window.rolling": "5 小时",
      "window.weekly": "每周",
      "window.monthly": "每月",
      "row.remaining": "剩余 {{percent}}%",
      "row.reset": "{{duration}}后重置 · {{time}}",
      "row.resetNow": "即将重置",
      "row.limited": "已达上限",
      "row.windowLeft": "窗口剩余 {{percent}}% · {{duration}}后重置 · {{pace}}",
      "pace.under": "低于节奏",
      "pace.over": "高于节奏",
      "pace.even": "符合节奏",
      "loading": "加载中…",
      "error": "无法加载用量。",
      "error.stale": "无法刷新。",
      "retry": "重试",
      "empty.title": "未连接 Go 订阅",
      "empty.body": "连接 OpenCode Go 以查看用量。",
      "empty.console": "打开控制台",
      "footer.now": "刚刚",
      "footer.agoMinutes": "{{count}} 分钟前",
      "footer.refresh": "刷新",
      "footer.refreshing": "正在刷新…",
      "footer.refreshIn": "{{seconds}} 秒后可用",
      "footer.console": "控制台 ↗",
      "close": "关闭",
      "settings.open": "位置设置",
      "settings.title": "位置",
      "settings.description": "选择显示位置。",
      "settings.saved": "位置已更新",
      "settings.drag": "拖动面板",
      "settings.reset": "恢复默认位置",
      "settings.resetDone": "位置已重置",
      "settings.footer.label": "更新按钮旁",
      "settings.footer.description": "与更新按钮相同的位置：侧边标签页中位于侧边栏底部，顶部标签页中位于标签栏末尾。",
      "settings.header.label": "会话标题栏",
      "settings.header.description": "位于上下文控件旁。",
      "settings.sidebar.label": "侧边栏标题栏",
      "settings.sidebar.description": "位于侧边栏切换按钮旁。",
      "settings.unavailable": "此布局中不可用。",
      "duration.days": "{{days}} 天 {{hours}} 小时",
      "duration.hours": "{{hours}} 小时 {{minutes}} 分钟",
      "duration.minutes": "{{minutes}} 分钟",
    },
  },
})

const WINDOWS: { key: WindowKey; label: string }[] = [
  { key: "rolling", label: "window.rolling" },
  { key: "weekly", label: "window.weekly" },
  { key: "monthly", label: "window.monthly" },
]

function clock(ms: number, locale?: string) {
  const date = new Date(ms)
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  return new Intl.DateTimeFormat(locale, sameDay
    ? { hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date)
}

function fullDate(ms: number, locale?: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms))
}

function findPill(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-slot="titlebar-update"] button'))
    .find((button) => button.getAttribute("aria-label") === label)
}

function findTrigger(placement: EffectivePlacement, label: string) {
  if (placement === "footer" || placement === "titlebar") return findPill(label)
  return document.querySelector<HTMLElement>(`[data-ogu-trigger="${placement}"]`)
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

function resetText(t: Translate, meter: Meter, now: number, locale?: string) {
  const resetIn = meter.resetsAt - now
  if (resetIn <= 0) return t("row.resetNow")
  return t("row.reset", { duration: durationText(t, resetIn), time: clock(meter.resetsAt, locale) })
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
          title={fullDate(props.meter.resetsAt, ctx.locale.locale())}
        >
          {resetText(ctx.t, props.meter, props.now(), ctx.locale.locale())}
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

function HeaderTrigger(props: {
  active: Accessor<boolean>
  open: Accessor<boolean>
  toggle: () => void
}) {
  const ctx = usePlugin<typeof definition>()

  return (
    <Show when={props.active()}>
      <button
        type="button"
        class="ogu-trigger"
        data-ogu-trigger="header"
        aria-label={ctx.t("pill.title")}
        aria-pressed={props.open()}
        title={ctx.t("pill.title")}
        onClick={props.toggle}
      >
        <ctx.ui.Icon name={ctx.icons.gauge} size="small" />
      </button>
    </Show>
  )
}

function InjectedTrigger(props: {
  placement: "sidebar"
  active: Accessor<boolean>
  open: Accessor<boolean>
  toggle: () => void
}) {
  const ctx = usePlugin<typeof definition>()

  let button: HTMLButtonElement | undefined
  let target: HTMLElement | undefined
  let observer: MutationObserver | undefined
  let frame = 0

  const visible = (element: Element | null): element is HTMLElement => {
    if (!(element instanceof HTMLElement)) return false
    const box = element.getBoundingClientRect()
    return box.width > 0 && box.height > 0 && element.checkVisibility?.() !== false
  }

  const findTarget = () => {
    const labels = [ctx.t("command.sidebar.toggle"), ctx.t("command.sidebar.toggle.unread")]
    return Array.from(document.querySelectorAll<HTMLButtonElement>("button[aria-label]"))
      .find((element) => labels.includes(element.getAttribute("aria-label") ?? "") && visible(element))
  }

  const update = () => {
    if (!button) return
    button.setAttribute("aria-label", ctx.t("pill.title"))
    button.setAttribute("aria-pressed", String(props.open()))
    button.title = ctx.t("pill.title")
  }

  const remove = () => {
    button?.remove()
    button = undefined
    target = undefined
  }

  const mount = () => {
    const next = findTarget()
    if (!next) {
      remove()
      return
    }
    if (button && target === next && button.parentElement) {
      update()
      return
    }

    remove()
    button = document.createElement("button")
    button.type = "button"
    button.className = `ogu-trigger ogu-trigger-${props.placement}`
    button.setAttribute("data-ogu-trigger", props.placement)
    button.innerHTML = gauge
    button.addEventListener("click", props.toggle)
    update()

    next.insertAdjacentElement("afterend", button)

    target = next
  }

  const schedule = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(mount)
  }

  createEffect(() => {
    if (!props.active()) {
      observer?.disconnect()
      observer = undefined
      remove()
      return
    }

    untrack(mount)
    observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })

    onCleanup(() => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      observer = undefined
      remove()
    })
  })

  createEffect(() => {
    props.open()
    ctx.t("pill.title")
    update()
  })

  return null
}

function PlacementSettings(props: {
  hasSidebar: Accessor<boolean>
  onChoose: (placement: Placement) => void
  showReset: Accessor<boolean>
  canReset: Accessor<boolean>
  onReset: () => void
}) {
  const ctx = usePlugin<typeof definition>()

  const available = (id: Placement) => id !== "sidebar" || props.hasSidebar()

  return (
    <div class="ogu-settings">
      <For each={PLACEMENTS}>
        {(item) => {
          const selected = () => ctx.stores.prefs.value.placement === item.id
          const enabled = () => available(item.id)

          return (
            <button
              type="button"
              class="ogu-option"
              aria-pressed={selected()}
              disabled={!enabled()}
              title={enabled() ? undefined : ctx.t("settings.unavailable")}
              onClick={() => enabled() && props.onChoose(item.id)}
            >
              <span class="ogu-option-copy">
                <span class="ogu-option-label">{ctx.t(item.label)}</span>
                <span class="ogu-option-description">
                  {ctx.t(item.description)}
                  <Show when={!enabled()}> {ctx.t("settings.unavailable")}</Show>
                </span>
              </span>
              <Show when={selected()}>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="m3 7.2 2.6 2.6L11 4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </Show>
            </button>
          )
        }}
      </For>
      <Show when={props.showReset()}>
        <div class="ogu-reset-position">
          <button type="button" class="ogu-btn" disabled={!props.canReset()} onClick={props.onReset}>
            {ctx.t("settings.reset")}
          </button>
        </div>
      </Show>
    </div>
  )
}

function UsagePanel(props: {
  open: Accessor<boolean>
  placement: Accessor<EffectivePlacement>
  hasSidebar: Accessor<boolean>
  onClose: () => void
  onDismiss: () => void
  onPlaced: () => void
}) {
  const ctx = usePlugin<typeof definition>()
  const [limits, setLimits] = createSignal<Limits | null | undefined>(undefined)
  const [error, setError] = createSignal<string>()
  const [loading, setLoading] = createSignal(false)
  const [updatedAt, setUpdatedAt] = createSignal<number>()
  const [now, setNow] = createSignal(Date.now())
  const [anchor, setAnchor] = createSignal<Anchor>()
  const [lastRequestAt, setLastRequestAt] = createSignal<number>()
  const [hideResets, setHideResets] = createSignal(false)
  const [view, setView] = createSignal<"usage" | "settings">("usage")
  const [dragging, setDragging] = createSignal(false)

  createEffect(() => {
    if (ctx.layout.narrow()) setView("usage")
  })

  const layout = (): PanelLayout => {
    if (!props.hasSidebar()) return "top"
    const sidebar = document.querySelector<HTMLElement>('aside[data-slot="vertical-tabs-sidebar"]')
    if (!sidebar) return "top"

    const closeLabels = new Set(["Close tab", ctx.t("ui.tabs.close")])
    const tabs = Array.from(sidebar.querySelectorAll<HTMLButtonElement>("button[aria-label]"))
      .some((element) => closeLabels.has(element.getAttribute("aria-label") ?? ""))
    return tabs ? "side" : "inbox"
  }

  const draggable = () => props.placement() === "header" || props.placement() === "sidebar"
  const offsets = () => ctx.stores.prefs.value.offsets ?? {}

  const closeOutside = (event: PointerEvent) => {
    if (!props.open() || !ctx.layout.narrow()) return
    const target = event.target
    if (!(target instanceof Node)) return
    if (panel?.contains(target)) return

    const trigger = findTrigger(props.placement(), ctx.t("pill.title"))
    if (trigger?.contains(target)) return
    props.onDismiss()
  }

  createEffect(() => {
    if (!props.open() || !ctx.layout.narrow()) return
    document.addEventListener("pointerdown", closeOutside, true)
    onCleanup(() => document.removeEventListener("pointerdown", closeOutside, true))
  })

  let panel: HTMLDivElement | undefined
  let samples: HTMLDivElement | undefined
  let frame = 0
  let disposed = false
  let request = 0
  let baseAnchor: BaseAnchor | undefined
  let dragStart: { x: number; y: number; base: BaseAnchor; offset: PanelOffset } | undefined

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

    setView("usage")
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
    const kind = props.placement()
    const trigger = findTrigger(kind, ctx.t("pill.title"))
    if (!trigger) {
      setAnchor(undefined)
      return
    }

    const button = trigger.getBoundingClientRect()
    if (button.width === 0 || button.height === 0) {
      setAnchor(undefined)
      return
    }

    const pad = 8

    if (kind === "footer") {
      const sidebar = document.querySelector<HTMLElement>('aside[data-slot="vertical-tabs-sidebar"]')
      if (!sidebar) {
        setAnchor(undefined)
        return
      }

      const box = sidebar.getBoundingClientRect()
      const width = box.width - pad * 2
      const height = button.top - pad * 2
      if (width < 120 || height < 80) {
        setAnchor(undefined)
        return
      }

      baseAnchor = undefined
      setAnchor({
        left: box.left + pad,
        width,
        bottom: Math.max(pad, window.innerHeight - button.top + pad),
        maxHeight: height,
      })
      return
    }

    const width = Math.min(320, window.innerWidth - pad * 2)
    let left: number

    if (kind === "sidebar") {
      const sidebar = document.querySelector<HTMLElement>('aside[data-slot="vertical-tabs-sidebar"]')
      if (!sidebar) {
        setAnchor(undefined)
        return
      }
      left = sidebar.getBoundingClientRect().right + pad + 2
    } else if (kind === "header") {
      const headerRight = headerRightOf(trigger)
      // Start beside the chat panel, not over it, when the app reserves a right-side area.
      left = headerRight !== undefined ? headerRight + 20 : button.right - width + 20
    } else {
      left = button.right - width + 12
    }

    left = clamp(left, pad, window.innerWidth - width - pad)

    if (kind === "titlebar" && button.top > window.innerHeight / 2) {
      const maxHeight = button.top - pad * 2
      if (maxHeight < 80) {
        setAnchor(undefined)
        return
      }

      baseAnchor = undefined
      setAnchor({
        left,
        width,
        bottom: Math.max(pad, window.innerHeight - button.top + pad),
        maxHeight,
      })
      return
    }

    const top = button.bottom + (kind === "titlebar" ? pad + 10 : kind === "sidebar" ? pad + 36 : pad)
    const maxHeight = window.innerHeight - top - pad
    if (maxHeight < 80) {
      setAnchor(undefined)
      return
    }

    if (kind === "header" || kind === "sidebar") {
      const base = { left, width, top }
      baseAnchor = base
      setAnchor(applyOffset(base, offsets()[offsetKey(kind, layout())], { width: window.innerWidth, height: window.innerHeight }))
      return
    }

    baseAnchor = undefined
    setAnchor({ left, width, top, maxHeight })
  }

  const scheduleMeasure = () => {
    if (dragging()) return
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(measure)
  }

  const saveOffset = (placement: "header" | "sidebar", offset: PanelOffset) => {
    const key = offsetKey(placement, layout())
    ctx.stores.prefs.update((draft) => {
      const next = { ...(draft.offsets ?? {}) }
      if (Math.abs(offset.dx) < 1 && Math.abs(offset.dy) < 1) delete next[key]
      else next[key] = { dx: Math.round(offset.dx), dy: Math.round(offset.dy) }
      draft.offsets = next
    })
  }

  const moveDrag = (event: PointerEvent) => {
    if (!dragStart) return
    const dx = dragStart.offset.dx + event.clientX - dragStart.x
    const dy = dragStart.offset.dy + event.clientY - dragStart.y
    setAnchor(applyOffset(dragStart.base, { dx, dy }, { width: window.innerWidth, height: window.innerHeight }))
  }

  const finishDrag = () => {
    window.removeEventListener("pointermove", moveDrag)
    window.removeEventListener("pointerup", finishDrag)
    window.removeEventListener("pointercancel", finishDrag)

    if (dragStart) {
      const current = anchor()
      const placement = props.placement()
      if (current && current.top !== undefined && (placement === "header" || placement === "sidebar")) {
        saveOffset(placement, { dx: current.left - dragStart.base.left, dy: current.top - dragStart.base.top })
      }
    }

    dragStart = undefined
    setDragging(false)
    scheduleMeasure()
  }

  const startDrag = (event: PointerEvent) => {
    if (view() !== "settings" || !draggable() || !baseAnchor) return
    const current = anchor()
    if (!current || current.top === undefined) return

    event.preventDefault()
    dragStart = {
      x: event.clientX,
      y: event.clientY,
      base: baseAnchor,
      offset: { dx: current.left - baseAnchor.left, dy: current.top - baseAnchor.top },
    }
    setDragging(true)
    window.addEventListener("pointermove", moveDrag)
    window.addEventListener("pointerup", finishDrag)
    window.addEventListener("pointercancel", finishDrag)
  }

  const nudge = (event: KeyboardEvent) => {
    const step = event.shiftKey ? 16 : 4
    const key = event.key
    if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "ArrowUp" && key !== "ArrowDown") return
    if (view() !== "settings" || !draggable() || !baseAnchor) return

    const current = anchor()
    if (!current || current.top === undefined) return

    event.preventDefault()
    const dx = current.left - baseAnchor.left + (key === "ArrowLeft" ? -step : key === "ArrowRight" ? step : 0)
    const dy = current.top - baseAnchor.top + (key === "ArrowUp" ? -step : key === "ArrowDown" ? step : 0)
    const next = applyOffset(baseAnchor, { dx, dy }, { width: window.innerWidth, height: window.innerHeight })
    setAnchor(next)

    const placement = props.placement()
    if (placement === "header" || placement === "sidebar") {
      saveOffset(placement, { dx: next.left - baseAnchor.left, dy: next.top - baseAnchor.top })
    }
  }

  const reset = () => {
    const placement = props.placement()
    if (placement !== "header" && placement !== "sidebar") return

    const key = offsetKey(placement, layout())
    ctx.stores.prefs.update((draft) => {
      const next = { ...(draft.offsets ?? {}) }
      delete next[key]
      draft.offsets = next
    })
    ctx.toast.show({ title: ctx.t("settings.resetDone"), variant: "success" })
    scheduleMeasure()
  }

  const canReset = () => {
    const placement = props.placement()
    return (placement === "header" || placement === "sidebar") && !!offsets()[offsetKey(placement, layout())]
  }

  onCleanup(() => {
    window.removeEventListener("pointermove", moveDrag)
    window.removeEventListener("pointerup", finishDrag)
    window.removeEventListener("pointercancel", finishDrag)
  })

  createEffect(() => {
    if (!props.open()) {
      setAnchor(undefined)
      return
    }

    props.placement()
    scheduleMeasure()
    window.addEventListener("resize", scheduleMeasure)

    const sidebar = document.querySelector<HTMLElement>('aside[data-slot="vertical-tabs-sidebar"]')
    const trigger = findTrigger(props.placement(), ctx.t("pill.title"))
    const observer = new ResizeObserver(scheduleMeasure)
    if (sidebar) observer.observe(sidebar)
    if (trigger) observer.observe(trigger)

    const recheck = window.setInterval(scheduleMeasure, 1_000)
    const focus = requestAnimationFrame(() => panel?.focus({ preventScroll: true }))

    onCleanup(() => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(focus)
      window.clearInterval(recheck)
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

  const resetTexts = createMemo(() => rows().map((row) => resetText(ctx.t, row.meter, now(), ctx.locale.locale())))

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

  const choose = (next: Placement) => {
    ctx.stores.prefs.update((draft) => {
      draft.placement = next
    })
    ctx.toast.show({ title: ctx.t("settings.saved"), variant: "success" })
    props.onClose()
    props.onPlaced()
  }

  return (
    <Show when={props.open() && anchor()}>
      <Portal>
        <div
          ref={(element) => (panel = element)}
          class="ogu-panel"
          classList={{ "ogu-dragging": dragging() }}
          role="dialog"
          aria-modal="false"
          aria-label={ctx.t("pill.title")}
          tabindex="-1"
          style={anchor()
            ? `left:${anchor()!.left}px;width:${anchor()!.width}px;${anchor()!.top !== undefined ? `top:${anchor()!.top}px` : `bottom:${anchor()!.bottom}px`};max-height:${anchor()!.maxHeight}px`
            : undefined}
        >
          <div class="ogu-head">
            <Show when={view() === "settings" && draggable()}>
              <button
                type="button"
                class="ogu-grip"
                aria-label={ctx.t("settings.drag")}
                title={ctx.t("settings.drag")}
                onPointerDown={(event) => startDrag(event)}
                onKeyDown={(event) => nudge(event)}
              >
                <svg width="10" height="18" viewBox="0 0 10 18" aria-hidden="true">
                  <g fill="currentColor">
                    <circle cx="3" cy="4" r="1.2" />
                    <circle cx="7" cy="4" r="1.2" />
                    <circle cx="3" cy="9" r="1.2" />
                    <circle cx="7" cy="9" r="1.2" />
                    <circle cx="3" cy="14" r="1.2" />
                    <circle cx="7" cy="14" r="1.2" />
                  </g>
                </svg>
              </button>
            </Show>
            <div style={{ "min-width": 0, flex: 1 }}>
              <div class="ogu-title">
                {view() === "settings" ? ctx.t("settings.title") : ctx.t("panel.title")}
              </div>
              <Show when={view() === "settings"}>
                <div class="ogu-sub">{ctx.t("settings.description")}</div>
              </Show>
              <Show when={view() === "usage" && limits()}>
                <div class="ogu-sub">
                  {limits()!.workspace.name || ctx.t("panel.workspace")}
                  <Show when={ago()}> · {ago()}</Show>
                </div>
              </Show>
            </div>
            <div class="ogu-head-actions">
              <Show when={!ctx.layout.narrow()}>
                <button
                  type="button"
                  class="ogu-close"
                  aria-label={ctx.t("settings.open")}
                  aria-pressed={view() === "settings"}
                  title={ctx.t("settings.open")}
                  onClick={() => setView(view() === "settings" ? "usage" : "settings")}
                >
                  <ctx.ui.Icon name="sliders" size="small" />
                </button>
              </Show>
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
          </div>

          <Show when={view() === "usage"} fallback={<PlacementSettings hasSidebar={props.hasSidebar} onChoose={choose} showReset={draggable} canReset={canReset} onReset={reset} />}>
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
    const [hasSidebar, setHasSidebar] = createSignal(
      (document.querySelector<HTMLElement>('aside[data-slot="vertical-tabs-sidebar"]')?.getBoundingClientRect().width ?? 0) > 0,
    )
    const [hasSession, setHasSession] = createSignal(!!ctx.sessions.current())

    createEffect(() => {
      setHasSession(!!ctx.sessions.current())
    })

    let layoutFrame = 0
    const checkLayout = () => {
      cancelAnimationFrame(layoutFrame)
      layoutFrame = requestAnimationFrame(() => {
        const width = document.querySelector<HTMLElement>('aside[data-slot="vertical-tabs-sidebar"]')
          ?.getBoundingClientRect().width ?? 0
        setHasSidebar(width > 0)
      })
    }
    const layoutObserver = new MutationObserver(checkLayout)
    layoutObserver.observe(document.body, { childList: true, subtree: true })
    onCleanup(() => {
      layoutObserver.disconnect()
      cancelAnimationFrame(layoutFrame)
    })

    const placement = () => ctx.stores.prefs.value.placement
    const effective = (): EffectivePlacement => ctx.layout.narrow()
      ? "titlebar"
      : effectivePlacement(placement(), hasSidebar(), hasSession())

    createEffect(() => {
      if (!hasSidebar() && placement() === "sidebar") {
        ctx.stores.prefs.update((draft) => {
          draft.placement = "footer"
        })
      }
    })

    let reopenAfterSettings = false
    createEffect(() => {
      if (ctx.router.path().startsWith("/settings")) {
        if (open()) {
          reopenAfterSettings = true
          setOpen(false)
        }
        return
      }

      if (reopenAfterSettings) {
        reopenAfterSettings = false
        setOpen(true)
      }
    })

    const focusTrigger = () => {
      const trigger = findTrigger(effective(), ctx.t("pill.title"))
      ;(trigger ?? findPill(ctx.t("pill.title")))?.focus()
    }

    let flashFrame = 0
    let flashTimer = 0
    const flash = () => {
      cancelAnimationFrame(flashFrame)
      window.clearTimeout(flashTimer)

      const label = ctx.t("pill.title")
      let tries = 0
      const apply = () => {
        const trigger = findTrigger(effective(), label)
        if (!trigger) {
          if (tries++ < 30) flashFrame = requestAnimationFrame(apply)
          return
        }
        trigger.classList.remove("ogu-attention")
        void trigger.offsetWidth
        trigger.classList.add("ogu-attention")
        flashTimer = window.setTimeout(() => trigger.classList.remove("ogu-attention"), 2_600)
      }
      flashFrame = requestAnimationFrame(apply)
    }

    onCleanup(() => {
      cancelAnimationFrame(flashFrame)
      window.clearTimeout(flashTimer)
    })

    const close = () => {
      setOpen(false)
      queueMicrotask(focusTrigger)
    }

    const dismiss = () => setOpen(false)

    const toggle = () => (open() ? close() : setOpen(true))

    ctx.add(Style, css)

    ctx.add(TitlebarItem, () => {
      const at = effective()
      if (at !== "footer" && at !== "titlebar") return undefined

      return {
        id: "usage",
        label: ctx.t("pill.label"),
        title: ctx.t("pill.title"),
        icon: ctx.icons.gauge,
        pressed: open(),
        run: toggle,
      }
    })

    ctx.add(Slot, {
      at: "session.header",
      order: 30,
      render: (input) => (
        <HeaderTrigger
          active={() => input.active && effective() === "header"}
          open={open}
          toggle={toggle}
        />
      ),
    })

    ctx.add(Slot, {
      at: "window.bottom",
      render: () => (
        <>
          <UsagePanel open={open} placement={effective} hasSidebar={hasSidebar} onClose={close} onDismiss={dismiss} onPlaced={flash} />
          <InjectedTrigger placement="sidebar" active={() => effective() === "sidebar"} open={open} toggle={toggle} />
        </>
      ),
    })
  },
})
