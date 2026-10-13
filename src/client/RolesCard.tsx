/**
 * The Custom-agent card on the Plugins page.
 *
 * Two interactions, because managing many tools inline does not scale:
 *   - the list is compact; each row is one tool with a remove control
 *   - clicking a row opens that tool's configuration
 *
 * Every control mutates a local draft; only 保存 writes the namespace, so a
 * half-finished edit never reaches the Host. Newly added tools are drafts too
 * and only become real delegation tools after a save and a reload.
 *
 * Two constraints shaped this component:
 *   - No DSH UI primitives. Nothing here can be verified against their prop
 *     contracts in this environment, so the surface is plain HTML plus one
 *     stylesheet installed once by the plugin entry.
 *   - Unknown tool names fail at delegation time, not at boot. The allow-list
 *     is therefore free text and the server's own error is shown verbatim,
 *     rather than pre-validated against a guess at the legal set.
 */

import { useCallback, useEffect, useState } from 'react'
import type { Tool } from './index.tsx'

/** Data and callbacks the card renders from. */
export interface ToolsCardFace {
  /** Current stored settings, or undefined before the namespace reports. */
  read: () => { tools?: Tool[] } | undefined
  /** Whether the Host accepts writes for this namespace. */
  writable: () => boolean
  /** Replace the whole tool array in one atomic mutation. */
  save: (tools: Tool[]) => Promise<boolean>
}

/** Props derived by the slot renderer. */
export interface ToolsCardProps {
  t: (key: string) => string
  view?: string
  hooks?: { scope?: unknown }
  face?: ToolsCardFace
}

/** A blank tool appended by 新增工具. */
function blankTool(index: number): Tool {
  return {
    toolName: `tool${index}`,
    provider: 'spawn',
    persona: '',
    allow: ['read'],
    enabled: true,
  }
}

/** Unique-enough default name for the Nth tool. */
function defaultName(tools: Tool[]): string {
  let n = tools.length + 1
  const taken = new Set(tools.map(tool => tool.toolName))
  while (taken.has(`tool${n}`)) n += 1
  return `tool${n}`
}

/**
 * Render the tool manager.
 * @param props - slot props plus the injected face.
 * @returns the card element.
 */
export function ToolsCard(props: ToolsCardProps): JSX.Element {
  const { t } = props
  const face = props.face
  const [draft, setDraft] = useState<Tool[]>([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (face === undefined || loaded) return
    setDraft(face.read()?.tools ?? [])
    setLoaded(true)
  }, [face, loaded])

  const mutate = useCallback((index: number, next: Partial<Tool>) => {
    setSaved(false)
    setDraft(current => current.map((tool, i) => (i === index ? { ...tool, ...next } : tool)))
  }, [])

  const remove = useCallback((index: number) => {
    setSaved(false)
    setDraft(current => current.filter((_, i) => i !== index))
    setOpen(current => (current === index ? null : current))
  }, [])

  const add = useCallback(() => {
    setSaved(false)
    setDraft(current => {
      const next = [...current, { ...blankTool(current.length + 1), toolName: defaultName(current) }]
      setOpen(next.length - 1)
      return next
    })
  }, [])

  const onSave = useCallback(() => {
    if (face === undefined) return
    setSaving(true)
    setError(null)
    face.save(draft).then(ok => {
      setSaving(false)
      if (ok) setSaved(true)
      else setError(t('saveFailed'))
    }, (reason: unknown) => {
      setSaving(false)
      setError(reason instanceof Error ? reason.message : String(reason))
    })
  }, [face, draft, t])

  if (face === undefined) {
    return (
      <section data-plugin="custom-agent">
        <h3>{t('title')}</h3>
        <p role="alert">{t('unavailable')}</p>
      </section>
    )
  }

  const disabled = !face.writable()
  const editing = open === null ? null : draft[open]

  // Render read-only wherever the slot only offers a summary, and the full
  // editor only on the `page` view that carries the save controls.
  if (props.view === 'summary') {
    return (
      <section data-plugin="custom-agent" data-view="summary" data-testid="custom-agent">
        <p data-testid="summary-count">{t('summary')}</p>
        <ul data-role="tool-summary">
          {draft.map(tool => (
            <li key={tool.toolName} data-tool={tool.toolName}>
              {tool.toolName === '' ? t('unnamed') : tool.toolName}
              {' — '}
              {tool.enabled ? t('enabled') : t('disabled')}
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <section data-plugin="custom-agent" data-testid="custom-agent">
      <h3>{t('title')}</h3>
      <p>{t('hint')}</p>

      <ul data-role="tool-list">
        {draft.map((tool, index) => (
          <li key={index} data-tool={tool.toolName}>
            <button
              type="button"
              className="ca-open"
              data-testid={`open-${tool.toolName}`}
              onClick={() => setOpen(index)}
            >
              {tool.toolName === '' ? t('unnamed') : tool.toolName}
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={tool.enabled}
              className="ca-switch"
              data-testid={`toggle-${tool.toolName}`}
              disabled={disabled}
              onClick={() => mutate(index, { enabled: !tool.enabled })}
            >
              <span className="ca-track" aria-hidden="true"><span className="ca-knob" /></span>
              <span>{tool.enabled ? t('enabled') : t('disabled')}</span>
            </button>
            <button
              type="button"
              className="ca-remove"
              data-testid={`remove-${tool.toolName}`}
              disabled={disabled}
              onClick={() => remove(index)}
            >
              {t('remove')}
            </button>
          </li>
        ))}
      </ul>

      <p>
        <button type="button" data-testid="add" disabled={disabled} onClick={add}>{t('add')}</button>
        <button type="button" data-testid="save" disabled={disabled || saving} onClick={onSave}>
          {saving ? t('saving') : t('save')}
        </button>
      </p>

      {saved && <p role="status">{t('saved')}</p>}
      {error !== null && <p role="alert" data-error="save">{error}</p>}

      {editing !== undefined && open !== null && (
        <div className="ca-overlay" data-testid="tool-dialog">
          <div className="ca-dialog" role="dialog" aria-label={t('configure')}>
            <h4>{t('configure')}</h4>

            <label>
              {t('toolName')}
              <input
                type="text"
                data-testid="field-toolName"
                value={editing.toolName}
                disabled={disabled}
                onChange={e => mutate(open, { toolName: e.target.value })}
              />
            </label>

            <label>
              {t('provider')}
              <input
                type="text"
                data-testid="field-provider"
                value={editing.provider}
                disabled={disabled}
                onChange={e => mutate(open, { provider: e.target.value })}
              />
            </label>

            <label>
              {t('allow')}
              <input
                type="text"
                data-testid="field-allow"
                value={editing.allow.join(' ')}
                disabled={disabled}
                onChange={e => mutate(open, {
                  allow: e.target.value.split(/[\s,]+/u).filter(Boolean),
                })}
              />
            </label>

            <label>
              {t('persona')}
              <textarea
                rows={4}
                data-testid="field-persona"
                value={editing.persona}
                disabled={disabled}
                onChange={e => mutate(open, { persona: e.target.value })}
              />
            </label>

            <label>
              <input
                type="checkbox"
                data-testid="field-enabled"
                checked={editing.enabled}
                disabled={disabled}
                onChange={e => mutate(open, { enabled: e.target.checked })}
              />
              {t('enabled')}
            </label>

            <p>
              <button type="button" data-testid="close" onClick={() => setOpen(null)}>{t('close')}</button>
              <button type="button" data-testid="dialog-remove" disabled={disabled} onClick={() => remove(open)}>
                {t('remove')}
              </button>
            </p>
            <p className="ca-note">{t('reloadNote')}</p>
          </div>
        </div>
      )}
    </section>
  )
}
