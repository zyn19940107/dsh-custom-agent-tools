// src/index.ts
import * as subagentTool from "@deepseek-ai/dsh-tool-subagent";
import z from "@deepseek-ai/schemastery";
var name = "custom-agent";
var inject = [];
var ToolSchema = z.object({
  /** Model-facing tool name. Must be unique across the profile. */
  toolName: z.string().required(),
  /** Subagent provider on `ctx.subagents` that runs the child. */
  provider: z.string().default("spawn"),
  /** Persona text shadowing the child's `deployment:persona-prefix`. */
  persona: z.string().default(""),
  /** Hard tool restriction. Empty means the child inherits the parent's tools. */
  allow: z.array(z.string()).default([]),
  /** Disabled tools stay in the list but register nothing. */
  enabled: z.boolean().default(true)
});
var DEFAULT_TOOLS = [{
  toolName: "reviewer",
  provider: "spawn",
  persona: "You are a meticulous code reviewer. Report concrete defects with file:line references and a concrete failure scenario. Never modify files.",
  allow: ["read", "read_image", "grep", "glob"],
  enabled: true
}];
var Config = z.object({
  tools: z.array(ToolSchema).default(DEFAULT_TOOLS).volatile()
});
function log(line) {
  process.stderr.write(`custom-agent: ${line}
`);
}
function apply(ctx, config) {
  const tools = config?.tools?.get();
  const list = Array.isArray(tools) && tools.length > 0 ? tools : DEFAULT_TOOLS;
  let registered = 0;
  for (const tool of list) {
    if (tool.enabled === false) {
      log(`tool "${tool.toolName}" skipped (disabled)`);
      continue;
    }
    try {
      ctx.plugin(subagentTool, {
        provider: tool.provider,
        toolName: tool.toolName,
        backgroundMode: "one-shot",
        ...tool.persona ? { persona: tool.persona } : {},
        ...tool.allow.length > 0 ? { toolFilter: { allow: tool.allow } } : {}
      });
      log(`tool "${tool.toolName}" registered provider=${tool.provider} allow=[${tool.allow.join(" ")}]`);
      registered += 1;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      log(`tool "${tool.toolName}" FAILED: ${reason}`);
    }
  }
  log(`${registered}/${list.length} tools active`);
}
export {
  Config,
  apply,
  inject,
  name
};
