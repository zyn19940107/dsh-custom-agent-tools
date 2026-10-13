/**
 * custom-agent — browser half.
 *
 * Registers a card into the Plugins page's `plugins.item` slot and edits the same
 * `tools` array the Host half turns into delegation tools. One namespace, one
 * save path: what the card shows is what the Host registers.
 *
 * The namespace `NS` must equal the Host Loader row's `id` in `cordis.patch.yml`,
 * because the settings service keys every namespace on `entry.id`.
 *
 * The card uses plain HTML plus one injected stylesheet on purpose. It cannot be
 * verified against the DSH UI primitives' prop contracts in this environment, so
 * the only framework surface it touches is `ctx.configForms.get(...)`.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { ToolsCard, type ToolsCardFace } from './RolesCard.tsx'
import { en, zh, type CustomAgentLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Custom-agent card copy. */
    'custom-agent': CustomAgentLocaleKey
  }
}

/** Dictionary namespace owned by this plugin; also the settings namespace. */
export const NS = 'custom-agent'

/**
 * Services this half needs from the browser context.
 *
 * Without this declaration Cordis injects nothing and `ctx.locale` throws
 * `cannot get property "locale" without inject`, which the shell reports only as
 * `1 entry did not activate`. There is no Host-side log for it.
 */
export const inject = ['slots', 'locale', 'configForms']

/** One managed delegation tool as the Host stores it. */
export interface Tool {
  /** Model-facing tool name; unique across the profile. */
  toolName: string
  /** Subagent provider on `ctx.subagents`. */
  provider: string
  /** Persona text shadowing the child's persona prefix. */
  persona: string
  /** Hard tool restriction. Empty means the child inherits the parent's tools. */
  allow: string[]
  /** Disabled tools stay in the list but register nothing. */
  enabled: boolean
}

/** Settings document shape backing the card. */
export interface CustomAgentSettings {
  tools?: Tool[]
}

/** Minimal styling for the list rows and the configure dialog. */
const STYLE_ID = 'custom-agent/styles'

const CSS = `
[data-plugin='custom-agent'] ul { list-style: none; margin: 0.5em 0; padding: 0; }
[data-plugin='custom-agent'] li { align-items: center; display: flex; gap: 0.75em; padding: 0.35em 0; }
[data-plugin='custom-agent'] li .ca-open { background: none; border: 0; cursor: pointer; flex: 1; font: inherit; padding: 0.2em 0; text-align: left; }
[data-plugin='custom-agent'] li .ca-remove { background: none; border: 1px solid currentColor; border-radius: 4px; cursor: pointer; opacity: 0.7; padding: 0.1em 0.6em; }
[data-plugin='custom-agent'] li .ca-remove:hover { opacity: 1; }
[data-plugin='custom-agent'] .ca-switch { align-items: center; background: none; border: 0; color: inherit; cursor: pointer; display: inline-flex; font: inherit; gap: 0.45em; opacity: 0.75; padding: 0.1em 0; }
[data-plugin='custom-agent'] .ca-switch:hover { opacity: 1; }
[data-plugin='custom-agent'] .ca-switch:disabled { cursor: not-allowed; opacity: 0.4; }
[data-plugin='custom-agent'] .ca-track { background: currentColor; border-radius: 999px; display: inline-block; height: 1.05em; opacity: 0.3; position: relative; transition: opacity 120ms ease; width: 1.9em; }
[data-plugin='custom-agent'] .ca-switch[aria-checked='true'] .ca-track { opacity: 0.85; }
[data-plugin='custom-agent'] .ca-knob { background: Canvas; border-radius: 999px; height: 0.85em; left: 0.1em; position: absolute; top: 50%; transform: translateY(-50%); transition: transform 120ms ease; width: 0.85em; }
[data-plugin='custom-agent'] .ca-switch[aria-checked='true'] .ca-knob { transform: translateY(-50%) translateX(0.85em); }
[data-plugin='custom-agent'] label { display: block; margin: 0.5em 0; }
[data-plugin='custom-agent'] input[type='text'], [data-plugin='custom-agent'] textarea { display: block; margin-top: 0.2em; width: 100%; }
[data-plugin='custom-agent'] .ca-overlay { align-items: center; background: rgb(0 0 0 / 45%); bottom: 0; display: flex; justify-content: center; left: 0; position: fixed; right: 0; top: 0; z-index: 1000; }
[data-plugin='custom-agent'] .ca-dialog { background: Canvas; border-radius: 8px; max-height: 85vh; max-width: 560px; overflow: auto; padding: 1.25rem; width: 90%; }
[data-plugin='custom-agent'] .ca-note { opacity: 0.7; font-size: 0.85em; }
`

/**
 * Install the card stylesheet once per document.
 */
function installStyles(): void {
  if (typeof document === 'undefined') return
  if (document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`) !== null) return
  const tag = document.createElement('style')
  tag.dataset.pluginCss = STYLE_ID
  tag.textContent = CSS
  document.head.appendChild(tag)
}

/**
 * Mount the Plugins-page card.
 * @param ctx - the client plugin context.
 */
export function apply(ctx: ClientContext): void {
  try {
    mount(ctx)
  } catch (error) {
    // The shell reports a failed row as "N entries did not activate" without the
    // reason, so the real error has to surface here or it is undebuggable.
    console.error('[custom-agent] apply threw', error)
  }
}

/**
 * Register dictionaries, styles, and the Plugins-page card.
 * @param ctx - the client plugin context.
 */
function mount(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(
    () => ctx.locale.register(NS, { zh, en }),
    'custom-agent: dictionaries',
  )

  installStyles()

  const scope = ctx.configForms.get<CustomAgentSettings>(NS)

  const face: ToolsCardFace = {
    read: () => scope.getSnapshot().value,
    writable: () => scope.getSnapshot().writable === true,
    /** Replace the whole array in one atomic mutation. */
    save: (tools: Tool[]) => {
      if (scope.getSnapshot().writable !== true) return Promise.resolve(false)
      return scope.mutate([{ op: 'set', path: ['tools'], value: tools as never }])
    },
  }

  ctx.effect(
    () => scope.subscribe(() => { /* the card re-reads through its own state */ }),
    'custom-agent: form subscription',
  )

  // `plugins.item` is the slot for the harness's OWN settings cards (Subagent,
  // Shell, Web search). It renders exclusively as `view: 'summary'`, so an
  // editor placed there never gets a `page` view and can never show its form.
  //
  // `plugins.bundle.config` is this package's own configuration surface: it
  // renders on the bundle page between the description and the rows, which is
  // exactly where a tool manager belongs — and it does receive `view: 'page'`.
  ctx.effect(
    () => ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
      name: 'plugins.bundle.config',
      key: '@zyn19940107/dsh-custom-agent',
      locale: NS,
      inject: () => ({ face }),
    }, ToolsCard)),
    'custom-agent: bundle configuration page',
  )
}

export { ToolsCard, ToolsCardFace }
export type { CustomAgentLocaleKey }
