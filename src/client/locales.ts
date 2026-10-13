/** Dictionary for the Custom-agent card. Every product string the card renders. */

export const zh = {
  title: '我的委派工具',
  hint: '添加、删除和配置你自己的委派工具。每个启用的工具会在下次启动时注册为模型可调用的工具。系统自带的 subagent 与 subagent_fork 不受影响。',
  enabled: '启用',
  disabled: '停用',
  unnamed: '(未命名)',
  toolName: '工具名',
  provider: '后端',
  allow: '允许的工具（空格分隔）',
  persona: '人设',
  configure: '配置',
  summary: '已配置的工具：',
  add: '新增工具',
  remove: '删除',
  close: '关闭',
  save: '保存',
  saving: '保存中…',
  saved: '已保存。重启或热重载后生效。',
  saveFailed: '保存失败：Host 未接受写入',
  unavailable: 'Host 尚未提供 custom-agent 设置命名空间。',
  reloadNote: '改动只在你点击列表里的工具时保存到表单；真正的保存请回到列表点「保存」。工具需要重启或热重载才会生效。',
} as const

export const en = {
  title: 'My delegation tools',
  hint: 'Add, remove and configure your own delegation tools. Each enabled tool is registered as a model-callable tool at the next boot. The built-in subagent and subagent_fork are untouched.',
  enabled: 'Enabled',
  disabled: 'Disabled',
  unnamed: '(unnamed)',
  toolName: 'Tool name',
  provider: 'Provider',
  allow: 'Allowed tools (space separated)',
  persona: 'Persona',
  configure: 'Configure',
  summary: 'Configured tools:',
  add: 'Add tool',
  remove: 'Remove',
  close: 'Close',
  save: 'Save',
  saving: 'Saving…',
  saved: 'Saved. Takes effect after a reload.',
  saveFailed: 'Save failed: the Host rejected the write',
  unavailable: 'The Host is not serving the custom-agent settings namespace yet.',
  reloadNote: 'Editing a tool changes the form draft only. Use Save in the list to persist it. Tools take effect after a reload.',
} as const

/** Every key the card may render. */
export type CustomAgentLocaleKey = keyof typeof zh
