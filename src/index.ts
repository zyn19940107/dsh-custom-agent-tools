/**
 * custom-agent — Host half.
 *
 * Roles are DATA, not Loader rows. This half reads its `roles` Config and
 * registers one delegation tool per role by instantiating the official
 * `@deepseek-ai/dsh-tool-subagent` plugin, so adding a reviewer (or any other
 * role) is a settings edit rather than a patch edit.
 *
 * A bundle is not itself a Loader row (app-boot/src/profile.ts:674): the loader
 * only reads the bundle's patch files, so `cordis.patch.yml` must insert a row
 * pointing at this package for this module to be imported at all.
 *
 * The schema library is `@deepseek-ai/schemastery`, not zod, and `roles` must be
 * `.volatile()`. The settings service (`packages/settings/settings/src/schema.ts`
 * `volatileForm`) selects a plugin's editable fields by walking the schemastery
 * node's `meta.volatile`; a plain zod object, or an un-marked array field, makes
 * it return undefined and the row is skipped from every namespace list. That
 * failure is silent on the Host — the Plugins page just never shows the card.
 *
 * The settings namespace is the Loader row's `id`, which is why the patch names
 * the row `custom-agent` and the browser half asks for `custom-agent`.
 *
 * Every registration is logged to stderr because the boot log is the only
 * observable that distinguishes "the row resolved" from "the role registered" —
 * a settings-driven role never appears in `--dump-config`.
 */

import * as subagentTool from '@deepseek-ai/dsh-tool-subagent'
import z from '@deepseek-ai/schemastery'

/** Cordis plugin name; also the settings namespace the Web form edits. */
export const name = 'custom-agent'

/** No services injected: role registration instantiates a child plugin itself. */
export const inject: string[] = []

/** One managed delegation tool. */
const ToolSchema = z.object({
  /** Model-facing tool name. Must be unique across the profile. */
  toolName: z.string().required(),
  /** Subagent provider on `ctx.subagents` that runs the child. */
  provider: z.string().default('spawn'),
  /** Persona text shadowing the child's `deployment:persona-prefix`. */
  persona: z.string().default(''),
  /** Hard tool restriction. Empty means the child inherits the parent's tools. */
  allow: z.array(z.string()).default([]),
  /** Disabled tools stay in the list but register nothing. */
  enabled: z.boolean().default(true),
})

/** The shipped default: one read-only reviewer. */
const DEFAULT_TOOLS = [{
  toolName: 'reviewer',
  provider: 'spawn',
  persona: 'You are a meticulous code reviewer. Report concrete defects with '
    + 'file:line references and a concrete failure scenario. Never modify files.',
  allow: ['read', 'read_image', 'grep', 'glob'],
  enabled: true,
}]

/** Settings shape backing the Plugins-page card. */
export const Config = z.object({
  tools: z.array(ToolSchema).default(DEFAULT_TOOLS).volatile(),
})

/** Boot-log line; stderr is captured by the sandbox driver. */
function log(line: string): void {
  process.stderr.write(`custom-agent: ${line}\n`)
}

/**
 * A `.volatile()` field arrives wrapped, not as its plain value.
 *
 * `z.array(...).volatile()` yields a `Volatile<T>` accessor, so `config.tools`
 * is an object and `Array.isArray()` is false. Reading it as the array silently
 * fell back to the shipped default — the bug that made the UI look saved while
 * the Host kept registering exactly one tool. Built-ins read it the same way
 * (`packages/subagent/tool-subagent/src/model-selection-settings.ts`).
 */
interface VolatileField<T> {
  get(): T
}

/** One tool as the Host receives it. */
interface Tool {
  toolName: string
  provider: string
  persona: string
  allow: string[]
  enabled: boolean
}

/** Minimal structural type; the Host half deliberately imports no Cordis types. */
interface Context {
  plugin(target: unknown, config?: unknown): unknown
}

/** Resolved shape of this row's Config. */
interface ResolvedConfig {
  tools?: VolatileField<Tool[]>
}

/**
 * Register one delegation tool per enabled entry.
 * @param ctx - this row's Cordis context.
 * @param config - the resolved `tools` setting.
 */
export function apply(ctx: Context, config?: ResolvedConfig): void {
  const tools = config?.tools?.get()
  const list: Tool[] = Array.isArray(tools) && tools.length > 0 ? tools : DEFAULT_TOOLS
  let registered = 0
  for (const tool of list) {
    if (tool.enabled === false) {
      log(`tool "${tool.toolName}" skipped (disabled)`)
      continue
    }
    try {
      ctx.plugin(subagentTool, {
        provider: tool.provider,
        toolName: tool.toolName,
        backgroundMode: 'one-shot',
        ...(tool.persona ? { persona: tool.persona } : {}),
        ...(tool.allow.length > 0 ? { toolFilter: { allow: tool.allow } } : {}),
      })
      log(`tool "${tool.toolName}" registered provider=${tool.provider} allow=[${tool.allow.join(' ')}]`)
      registered += 1
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      log(`tool "${tool.toolName}" FAILED: ${reason}`)
    }
  }
  log(`${registered}/${list.length} tools active`)
}
