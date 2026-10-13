---
description: "在 DeepSeek Harness 的插件页里管理你自己的委派工具；Host 在启动时为每个启用的工具注册一个模型可调用的工具。"
---

# dsh-custom-agent

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)(下称 DSH)
加一个**你自己工具的管理面板**:在插件页里添加、删除、配置委派工具,Host 在下次启动时
为每个启用的条目注册一个模型可以调用的工具。

系统自带的 `subagent` / `subagent_fork` **不受影响**——本包只添加你自己的工具。

> English: a DeepSeek Harness plugin that turns a role ("read-only reviewer",
> "test designer", …) into a tool you manage from the Plugins page. Each enabled
> entry is registered as its own model-callable delegation tool at boot.

---

## 安装

DSH 的版本范围:**0.2.0-rc.2**(与 `next` 标签一致)。

```sh
# 从 npm
dsh plugin --profile <你的profile> add @zyn19940107/dsh-custom-agent

# 或从 GitHub(仓库里带 lib/,clone 下来即可用,无需构建)
dsh plugin --profile <你的profile> add https://github.com/zyn19940107/dsh-custom-agent-tools
```

装完之后:

- 在 **插件 → 已安装** 里找到「我的委派工具」并打开开关
- 打开它的详情页,描述下方就是管理面板

默认带一个 `reviewer` 工具(只读审查员),开箱即用。

---

## 面板能做什么

| 操作 | 说明 |
|---|---|
| **新增工具** | 追加一个条目并直接打开它的配置 |
| **删除** | 移除该条目 |
| **点工具名** | 弹出配置对话框 |
| **启用开关** | 逐条切换;停用的条目保留配置但不注册工具 |
| **保存** | 一次性写入设置;需要重启或热重载才生效 |

每个工具可配置:

| 字段 | 含义 |
|---|---|
| **工具名** | 模型看到并调用的名字,必须全 profile 唯一 |
| **后端** | 用哪个 subagent 提供方,默认 `spawn` |
| **允许的工具** | 子 agent 能用的工具白名单,空格分隔 |
| **人设** | 遮蔽子 agent 的 `deployment:persona-prefix` |
| **启用** | 是否在启动时注册 |

> **「允许的工具」是硬约束,不是提示词。** 名单之外的工具在子 agent 的工具表里根本
> 不存在,模型想调也调不到——比在人设里写"请不要修改文件"可靠得多。

---

## 原理

```
插件页面板  ──写入──▶  custom-agent 这个 settings 命名空间
                              │
                        Host 启动时读取
                              │
                     每个启用的条目 → 实例化一次
                     @deepseek-ai/dsh-tool-subagent
                              │
                              ▼
                    模型可调用的工具(如 reviewer)
```

三点值得知道:

**1. 角色是数据,不是配置行。**
Host 半边读自己的 `tools` 设置,为每个启用条目注册一个委派工具。加一个角色就是加一条
设置,不需要改 patch。因此**角色不会出现在 `dsh --dump-config` 里**——启动日志才是它的
可观测量:

```
custom-agent: tool "reviewer" registered provider=spawn allow=[read read_image grep glob]
custom-agent: 1/1 tools active
```

**2. 面板和 Host 读的是同一份数据**,不存在第二个真源。

**3. 一行 patch,两个半边。**
`cordis.patch.yml` 只有一行:

```yaml
- insert:
    - id: custom-agent
      name: '@zyn19940107/dsh-custom-agent'
```

这一行同时注册 Host 半边(`main`)和浏览器半边(因为包声明了 `dsh.client`)。
bundle 自身不是 Loader 行,不插这一行模块就永远不会被加载。

---

## 已知限制

- **改动需要重启或热重载** 才生效——工具是在 Host 启动时注册的。
- **工具名必须唯一。** 冲突时该条目注册失败,启动日志会打印 `FAILED` 行。
- **「允许的工具」是自由文本。** DSH 没有公开 API 能列出合法的可限制工具集合
  (`restrictableNames` / `knownNames` 都是私有的),所以填错的名字**要到真正创建
  子 agent 时才报错**,启动是绿的。报错会原样显示,把名字改对即可。
- **配了人设或工具白名单的工具不要用 `fork` 后端。** 这两项会改变请求头部,破坏
  继承历史的 KV cache 复用,`fork` 的意义就没了。
- **所有工具共享同一个工作目录。** DSH 不提供 worktree 隔离或文件锁。
- 面板只用了原生 HTML 控件,没有使用 DSH 的 UI 原语组件。

---

## 开发

```sh
node build.mjs     # 只需 node;唯一构建期依赖是 esbuild,react 是 external 不需要装
```

构建产出两个契约:

- **Node 半边** `lib/index.js` —— 纯 ESM,`@deepseek-ai/dsh-tool-subagent` 与
  `@deepseek-ai/schemastery` 保持 external,由 Host 在运行时解析
- **浏览器半边** `lib/client.js` —— CommonJS 闭包,首尾是 shell module loader
  需要的手写契约,由 `/plugins/??<包名>/client.js&rev=<rev>` 投递

`lib/` **提交进仓库**:git 安装不会跑构建,不提交的话装出来是个没有产物的空包。

改完之后的验证顺序见 [RESEARCH.md](RESEARCH.md)——那里记录了让这些机制真正跑通
所踩过的坑,包括三个会**静默失败**的门槛(schemastery 而不是 zod、字段必须标
`.volatile()`、命名空间等于 Loader 行的 `id`)。

---

## 兼容性

本包针对以下组合验证:

| 组件 | 版本 |
|---|---|
| DSH runtime | `0.2.0-rc.2` |
| `@deepseek-ai/dsh-tool-subagent` | `0.2.0-rc.2`(`next` 标签) |
| `@deepseek-ai/cordis` | `4.0.4` |
| `@deepseek-ai/schemastery` | `3.18.0` |

> ⚠️ 注意这些 `@deepseek-ai/*` 包的 npm `latest` 标签**远落后于**实际运行时使用的
> `next` 标签(例如 `dsh-tool-subagent` 的 latest 还是 `0.0.1-rc.1`)。所以依赖是按
> `next` 钉死的,不要按 `latest` 放宽。

---

## License

[MIT](LICENSE)
