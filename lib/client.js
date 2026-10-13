window.__ModuleLoader__.load({ id: "@zyn19940107/dsh-custom-agent", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  NS: () => NS,
  ToolsCard: () => ToolsCard,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/RolesCard.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
function blankTool(index) {
  return {
    toolName: `tool${index}`,
    provider: "spawn",
    persona: "",
    allow: ["read"],
    enabled: true
  };
}
function defaultName(tools) {
  let n = tools.length + 1;
  const taken = new Set(tools.map((tool) => tool.toolName));
  while (taken.has(`tool${n}`)) n += 1;
  return `tool${n}`;
}
function ToolsCard(props) {
  const { t } = props;
  const face = props.face;
  const [draft, setDraft] = (0, import_react.useState)([]);
  const [loaded, setLoaded] = (0, import_react.useState)(false);
  const [open, setOpen] = (0, import_react.useState)(null);
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [saved, setSaved] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    if (face === void 0 || loaded) return;
    setDraft(face.read()?.tools ?? []);
    setLoaded(true);
  }, [face, loaded]);
  const mutate = (0, import_react.useCallback)((index, next) => {
    setSaved(false);
    setDraft((current) => current.map((tool, i) => i === index ? { ...tool, ...next } : tool));
  }, []);
  const remove = (0, import_react.useCallback)((index) => {
    setSaved(false);
    setDraft((current) => current.filter((_, i) => i !== index));
    setOpen((current) => current === index ? null : current);
  }, []);
  const add = (0, import_react.useCallback)(() => {
    setSaved(false);
    setDraft((current) => {
      const next = [...current, { ...blankTool(current.length + 1), toolName: defaultName(current) }];
      setOpen(next.length - 1);
      return next;
    });
  }, []);
  const onSave = (0, import_react.useCallback)(() => {
    if (face === void 0) return;
    setSaving(true);
    setError(null);
    face.save(draft).then((ok) => {
      setSaving(false);
      if (ok) setSaved(true);
      else setError(t("saveFailed"));
    }, (reason) => {
      setSaving(false);
      setError(reason instanceof Error ? reason.message : String(reason));
    });
  }, [face, draft, t]);
  if (face === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { "data-plugin": "custom-agent", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: t("title") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", children: t("unavailable") })
    ] });
  }
  const disabled = !face.writable();
  const editing = open === null ? null : draft[open];
  if (props.view === "summary") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { "data-plugin": "custom-agent", "data-view": "summary", "data-testid": "custom-agent", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { "data-testid": "summary-count", children: t("summary") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { "data-role": "tool-summary", children: draft.map((tool) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { "data-tool": tool.toolName, children: [
        tool.toolName === "" ? t("unnamed") : tool.toolName,
        " \u2014 ",
        tool.enabled ? t("enabled") : t("disabled")
      ] }, tool.toolName)) })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { "data-plugin": "custom-agent", "data-testid": "custom-agent", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: t("title") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("hint") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { "data-role": "tool-list", children: draft.map((tool, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { "data-tool": tool.toolName, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "ca-open",
          "data-testid": `open-${tool.toolName}`,
          onClick: () => setOpen(index),
          children: tool.toolName === "" ? t("unnamed") : tool.toolName
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          role: "switch",
          "aria-checked": tool.enabled,
          className: "ca-switch",
          "data-testid": `toggle-${tool.toolName}`,
          disabled,
          onClick: () => mutate(index, { enabled: !tool.enabled }),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ca-track", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ca-knob" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tool.enabled ? t("enabled") : t("disabled") })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "ca-remove",
          "data-testid": `remove-${tool.toolName}`,
          disabled,
          onClick: () => remove(index),
          children: t("remove")
        }
      )
    ] }, index)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "data-testid": "add", disabled, onClick: add, children: t("add") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "data-testid": "save", disabled: disabled || saving, onClick: onSave, children: saving ? t("saving") : t("save") })
    ] }),
    saved && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "status", children: t("saved") }),
    error !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", "data-error": "save", children: error }),
    editing !== void 0 && open !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ca-overlay", "data-testid": "tool-dialog", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ca-dialog", role: "dialog", "aria-label": t("configure"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: t("configure") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        t("toolName"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "text",
            "data-testid": "field-toolName",
            value: editing.toolName,
            disabled,
            onChange: (e) => mutate(open, { toolName: e.target.value })
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        t("provider"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "text",
            "data-testid": "field-provider",
            value: editing.provider,
            disabled,
            onChange: (e) => mutate(open, { provider: e.target.value })
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        t("allow"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "text",
            "data-testid": "field-allow",
            value: editing.allow.join(" "),
            disabled,
            onChange: (e) => mutate(open, {
              allow: e.target.value.split(/[\s,]+/u).filter(Boolean)
            })
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        t("persona"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "textarea",
          {
            rows: 4,
            "data-testid": "field-persona",
            value: editing.persona,
            disabled,
            onChange: (e) => mutate(open, { persona: e.target.value })
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "checkbox",
            "data-testid": "field-enabled",
            checked: editing.enabled,
            disabled,
            onChange: (e) => mutate(open, { enabled: e.target.checked })
          }
        ),
        t("enabled")
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "data-testid": "close", onClick: () => setOpen(null), children: t("close") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "data-testid": "dialog-remove", disabled, onClick: () => remove(open), children: t("remove") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ca-note", children: t("reloadNote") })
    ] }) })
  ] });
}

// src/client/locales.ts
var zh = {
  title: "\u6211\u7684\u59D4\u6D3E\u5DE5\u5177",
  hint: "\u6DFB\u52A0\u3001\u5220\u9664\u548C\u914D\u7F6E\u4F60\u81EA\u5DF1\u7684\u59D4\u6D3E\u5DE5\u5177\u3002\u6BCF\u4E2A\u542F\u7528\u7684\u5DE5\u5177\u4F1A\u5728\u4E0B\u6B21\u542F\u52A8\u65F6\u6CE8\u518C\u4E3A\u6A21\u578B\u53EF\u8C03\u7528\u7684\u5DE5\u5177\u3002\u7CFB\u7EDF\u81EA\u5E26\u7684 subagent \u4E0E subagent_fork \u4E0D\u53D7\u5F71\u54CD\u3002",
  enabled: "\u542F\u7528",
  disabled: "\u505C\u7528",
  unnamed: "(\u672A\u547D\u540D)",
  toolName: "\u5DE5\u5177\u540D",
  provider: "\u540E\u7AEF",
  allow: "\u5141\u8BB8\u7684\u5DE5\u5177\uFF08\u7A7A\u683C\u5206\u9694\uFF09",
  persona: "\u4EBA\u8BBE",
  configure: "\u914D\u7F6E",
  summary: "\u5DF2\u914D\u7F6E\u7684\u5DE5\u5177\uFF1A",
  add: "\u65B0\u589E\u5DE5\u5177",
  remove: "\u5220\u9664",
  close: "\u5173\u95ED",
  save: "\u4FDD\u5B58",
  saving: "\u4FDD\u5B58\u4E2D\u2026",
  saved: "\u5DF2\u4FDD\u5B58\u3002\u91CD\u542F\u6216\u70ED\u91CD\u8F7D\u540E\u751F\u6548\u3002",
  saveFailed: "\u4FDD\u5B58\u5931\u8D25\uFF1AHost \u672A\u63A5\u53D7\u5199\u5165",
  unavailable: "Host \u5C1A\u672A\u63D0\u4F9B custom-agent \u8BBE\u7F6E\u547D\u540D\u7A7A\u95F4\u3002",
  reloadNote: "\u6539\u52A8\u53EA\u5728\u4F60\u70B9\u51FB\u5217\u8868\u91CC\u7684\u5DE5\u5177\u65F6\u4FDD\u5B58\u5230\u8868\u5355\uFF1B\u771F\u6B63\u7684\u4FDD\u5B58\u8BF7\u56DE\u5230\u5217\u8868\u70B9\u300C\u4FDD\u5B58\u300D\u3002\u5DE5\u5177\u9700\u8981\u91CD\u542F\u6216\u70ED\u91CD\u8F7D\u624D\u4F1A\u751F\u6548\u3002"
};
var en = {
  title: "My delegation tools",
  hint: "Add, remove and configure your own delegation tools. Each enabled tool is registered as a model-callable tool at the next boot. The built-in subagent and subagent_fork are untouched.",
  enabled: "Enabled",
  disabled: "Disabled",
  unnamed: "(unnamed)",
  toolName: "Tool name",
  provider: "Provider",
  allow: "Allowed tools (space separated)",
  persona: "Persona",
  configure: "Configure",
  summary: "Configured tools:",
  add: "Add tool",
  remove: "Remove",
  close: "Close",
  save: "Save",
  saving: "Saving\u2026",
  saved: "Saved. Takes effect after a reload.",
  saveFailed: "Save failed: the Host rejected the write",
  unavailable: "The Host is not serving the custom-agent settings namespace yet.",
  reloadNote: "Editing a tool changes the form draft only. Use Save in the list to persist it. Tools take effect after a reload."
};

// src/client/index.tsx
var NS = "custom-agent";
var inject = ["slots", "locale", "configForms"];
var STYLE_ID = "custom-agent/styles";
var CSS = `
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
`;
function installStyles() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`) !== null) return;
  const tag = document.createElement("style");
  tag.dataset.pluginCss = STYLE_ID;
  tag.textContent = CSS;
  document.head.appendChild(tag);
}
function apply(ctx) {
  try {
    mount(ctx);
  } catch (error) {
    console.error("[custom-agent] apply threw", error);
  }
}
function mount(ctx) {
  const t = ctx.locale.bind(NS);
  ctx.effect(
    () => ctx.locale.register(NS, { zh, en }),
    "custom-agent: dictionaries"
  );
  installStyles();
  const scope = ctx.configForms.get(NS);
  const face = {
    read: () => scope.getSnapshot().value,
    writable: () => scope.getSnapshot().writable === true,
    /** Replace the whole array in one atomic mutation. */
    save: (tools) => {
      if (scope.getSnapshot().writable !== true) return Promise.resolve(false);
      return scope.mutate([{ op: "set", path: ["tools"], value: tools }]);
    }
  };
  ctx.effect(
    () => scope.subscribe(() => {
    }),
    "custom-agent: form subscription"
  );
  ctx.effect(
    () => ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
      name: "plugins.bundle.config",
      key: "@zyn19940107/dsh-custom-agent",
      locale: NS,
      inject: () => ({ face })
    }, ToolsCard)),
    "custom-agent: bundle configuration page"
  );
}
return module.exports;
} });
