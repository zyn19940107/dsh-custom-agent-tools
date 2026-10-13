# custom-agent — 落地记录与验证报告

> **状态标注**:`[已验证]` 有实测证据 · `[已读源码]` 直接读到的事实 · `[未验证]` 尚无证据
>
> 初版由一个**无执行通道**的会话产出,其中两条核心结论已被后续实测推翻。
> 本文件已按实测结果修订,**标记为推翻的段落保留原文并标注原因**,不静默删除。

---

## 0. 结论速览

| 命题 | 初版判断 | 实测结果 |
|---|---|---|
| 纯 bundle 带不了任何代码 | 断言成立 | ✅ 成立——但**可修复**,见 §1 |
| 三注册面全在上游仓,UI 走不通 | 断言"UI 是死的" | ❌ **推翻**——第三方 bundle 不需要那三处,见 §2 |
| 没有能用的工具列表 API | 断言成立 | ✅ 仍未找到公开 API,UI 改为自由文本,见 §4 |
| 角色不能变成数据 | 建议放弃动态注册 | ❌ **推翻**——动态注册已跑通,见 §3 |

**当前状态**

| 项 | 状态 | 证据 |
|---|---|---|
| bundle 开关双向 | ✅ 已验证 | 启用/移除/重装 三态 dump 对比 |
| Host 动态注册 | ✅ 已验证 | 启动日志 `2/2 tools active` |
| 客户端包被服务器投递 | ✅ 已验证 | `HTTP 200`,8605 字节 |
| 卡片渲染 | ✅ 已验证 | 插件页「官方」分组第 9 项 |
| 新增 / 删除 / 点开配置 | ✅ 已验证 | 浏览器实测 |
| 保存回环(UI → 设置 → Host) | ✅ 已验证 | 新建 `tool2` 后重启,Host 注册 `2/2` |
| 只读约束真的落到子 agent | ⬜ **未验证** | 需要 API key,见 §5 |


---

## 1. 坑 1:纯 bundle 带不了代码 —— 成立,但有出路

`[已读源码]` `packages/boot/app-boot/src/profile.ts:674`:

> `// A bundle is not a plugin row, so row admission never reads its own peers.`

初版由此推断"要么改上游仓,要么放弃 UI"。`[已验证]` **出路是 patch 自插一行指向自己**:

```yaml
- insert:
    - id: custom-agent-host
      name: '@local/dsh-custom-agent'
```

证据(沙盒启动,`LOADED.txt` 标记文件由 `lib/index.js` 在 activate 时写入):

```
marker content:
  ACTIVATED 2026-10-13T14:26:01.468Z
```

**同一行同时注册两个半边**:Host 半边来自 `main`,浏览器半边因为包声明了 `dsh.client` 而成为 shell 加载的 module-table 行。**不能再插第二行**,否则 overlay 会注册两次。

---

## 2. 坑 2:"三注册面够不着,UI 是死的" —— **推翻**

`[已验证]` 那三个注册面(`tsconfig.client.json` aggregate / `web-app/cordis.patch.yml` / `web-app/package.json`)**是给仓内包用的**。第三方 bundle 一个都不需要。

工作区里已有的 `@local/dsh-whale-girl` 就是活样板:它只声明了 `./client` 导出 + `dsh.client` 清单 + **自己的 `build.mjs`**,一行 patch,没有任何仓内注册。

复刻它的构建契约即可:

- Node 半边:ESM,`platform: node`,`external` = peerDependencies
- 浏览器半边:**CJS 闭包**,首尾必须是

  ```
  window.__ModuleLoader__.load({ id: "<pkg>", factory: (require) => {
  var module = { exports: {} }; var exports = module.exports;
  ...
  return module.exports;
  } });
  ```

- `external` 只保留 `PLATFORM_MODULES`(react / cordis / client-store / ui-slots / ui-primitives / ui-dockkit)

`[已验证]` 产物实测:

```
has ModuleLoader    : True
has factory(require): True
has footer          : True
requires react      : True
react NOT inlined   : True
line 1: window.__ModuleLoader__.load({ id: "@local/dsh-custom-agent", factory: (require) => {
```

`[已验证]` 真实 web 服务器确实在投递它(沙盒 profile 启动后抓 HTML):

```
GET plugins/??@local/dsh-custom-agent/client.js&rev=0fac91cc5bb8
HTTP 200  (8605 bytes served)
```

> ⚠️ **路由形态**:不是 `/plugins/<id>/client.js`,而是**图组合形式**
> `/plugins/??<id>/client.js&rev=<rev>`。`rev` 由服务端生成,自己拼 URL 必须带对。
> 初版探针用了资源形态,拿到 404 后一度误判为"客户端没挂上"。

---

## 3. 动态注册:可以,而且不用重写委派逻辑

初版认为 `dsh-tool-subagent` 的 Config 写死、不读 settings,所以角色无法变成数据。

`[已验证]` **它导出的是函数插件** `apply(ctx, config)`,因此可以被直接实例化:

```js
import * as subagentTool from '@deepseek-ai/dsh-tool-subagent'
ctx.plugin(subagentTool, { provider, toolName, persona, toolFilter })
```

每个角色一个实例。**角色成为 settings 里的一条数据,Host 启动时读它并注册对应数量的委派工具。**

实测证据(沙盒启动 stderr):

```
custom-agent: role "review" registered provider=spawn allow=[read read_image grep glob]
custom-agent: 1/1 roles active
activation failures: 0
```

**代价与取舍:**

- 角色不再出现在 `--dump-config` 里(它是运行期注册的,不是 patch 行)。**启动日志成为它唯一的可观测量。**
- 因此 `cordis.patch.yml` 里**不再有 `tool-reviewer` 静态行**——两个真源必然打架,而插件页卡片看不到 patch。

`[已验证]` **`Config` schema 必须能接受 `undefined`**:Loader 行没有 `config:`,Cordis 会用 `undefined` 去解析 schema,裸 `z.object(...)` 会拒绝并导致该行不激活:

```
custom-agent-host (@local/dsh-custom-agent): ValidationError: invalid config:
  - Invalid input: expected object, received undefined (at )
```

### 3.1 让一个包出现在 settings 命名空间里,需要三件事同时成立

初版和第二版都失败在这三件事上,它们的失败都是**静默**的(Host 正常启动、工具也注册了,只有卡片不出现):

1. **schema 库是 `@deepseek-ai/schemastery`,不是 zod。**
   `packages/settings/settings/src/schema.ts` 的 `volatileForm()` 走的是 schemastery 节点的
   `meta.volatile` / `.type` / `.dict`;一个 zod 对象对它什么也不是。

2. **字段必须标 `.volatile()`。**
   `volatileForm()` 递归时,不是 volatile、也不是含 live 字段的 object,一律返回 `undefined`,
   整个 entry 被 `describe()` 跳过。

3. **命名空间就是 Loader 行的 `id`。**
   `describe()` 遍历 `configEditor.configuration()` 并以 `entry.id` 为键。所以行必须叫
   `custom-agent`(与卡片用的 `NS` 一致),叫 `custom-agent-host` 就对不上。

`[已验证]` 三者齐备后:

```
namespaces served: [..., "dsh-context", "custom-agent"]
ours served? true
```

### 3.2 `.volatile()` 字段是被**包装**的,必须 `.get()`

这是最隐蔽的一个:UI 显示"已保存"、文件里也确实写进了两个工具、Host 启动却只注册一个。

```
rawKeys=["tools"] toolsType=object toolsIsArray=false toolsValue={}
```

`config.tools` 是个 `{}`,不是数组。内置的读法是:

```ts
// packages/subagent/tool-subagent/src/model-selection-settings.ts
this.config.allowedModels.get()      // ← .get()
```

`Array.isArray(config.tools)` 为 false,于是静默回退到内置默认(1 个),日志还打印成
`1/1 tools active` ——**看起来完全正常**。改成 `config.tools.get()` 之后才是真的 `2/2`。


修法是 `.default({})`,并且 `apply` 仍要对 `config.roles` 为空做兜底(zod v3/v4 的 `.default()` 语义不同)。

---

## 4. 坑 4:没有能用的工具列表 API —— 仍然成立

`[已验证]` 初版的结论正确:

- `restrictableNames` / `knownNames` 全是私有的(`packages/core/tools/src/index.ts:713/1008/1178`)
- `ctx.tools.schemas()` 返回的是 **visible**(已被上层过滤),且 `mode !== 'native'` 时**会塞进 `run_code`**,而 `restrict()` **明确拒绝** `run_code`
- 浏览器**够不到 `ctx.tools`**,那是 Host 服务

因此卡片**不做动态复选框**,改为**自由文本 + 原样显示服务端报错**。这是有意的取舍:宁可多打几个字,也不猜一个 API 名然后在启动时炸。

---

## 5. 仍未验证的部分

| 项 | 为什么没验 |
|---|---|
| **`review` 真的产出只读子 agent** | **没有任何 API key**(`DEEPSEEK_API_KEY` / `MINIMAX_CN_API_KEY` 均未设置,仓库无 `.env`)。 |
| **保存后热重载生效**(不重启) | 只验了"重启后生效";HMR 路径没单独验。 |
| **`toolFilter` 的运行时校验** | 初版坑 3 仍成立:`run_code` 与未知工具名这两条失败条件**要到真正创建子 agent 才触发**,启动是绿的。 |

**所以:"子 agent 工具表里没有 write" 这条硬判据,至今没有拿到证据。**

补上 API key 之后:插件页确认工具在列表里 → 新建会话 → 让模型调用它 →
查子 agent 的工具表。那是唯一能证明"只读"成立的路径。

---

## 6. 恢复执行通道后的执行顺序

> 环境事实:本机**没有安装 PowerShell 7**,只有 WinPS 5.1。
> harness 的 `pwsh` 通道因此全程不可用;下面所有命令都可用 WinPS 5.1 或直接调 Electron 完成。

```powershell
# 0. 先确认能用哪个 shell(别直接跑沙盒脚本)
Get-ChildItem 'D:\code\vibe'

# 1. 构建(唯一构建期依赖是 esbuild;react 是 external,不用装)
node D:\code\vibe\custom-agent\build.mjs

# 2. 装进沙盒(目录装,不要 tarball)
#    DSH_HOME=D:\code\vibe\dsh-sandbox\home
#    ELECTRON_RUN_AS_NODE=1
#    "<DSH安装>\DeepSeek Harness.exe" --expose-internals "<cli.js>" `
#        plugin --profile sandbox add D:\code\vibe\custom-agent

# 3. 启动,读 stderr 里的 custom-agent 行 —— 这是角色注册的唯一可观测量
# 4. 抓 HTML 里的 plugins/??@local/dsh-custom-agent/client.js&rev=... 确认投递
# 5. 新开无痕窗口打开 URL,F12 看 Console,确认卡片出现在插件页
# 6. 有 key 之后:真调一次 review,看子 agent 工具表里有没有 write  ← 硬判据
```

**每次重建后必须新开无痕窗口**:`rev` 变了,旧 HTML 里的 ref 会 404,表现是"插件没加载"而不是报错。

---

## 7. 复盘:这次踩到的执行层坑

| 症状 | 原因 | 修法 |
|---|---|---|
| dump `exit=0` 但零输出 | WinPS 5.1 的 `Write-Host` 走**信息流**,`\| ForEach-Object` 接不到 | 子进程 + `RedirectStandardOutput` |
| `dsh-sandbox.ps1 -Command dsh -- ...` 报"参数名具有二义性" | `--` 被 PowerShell 当成参数名 | 直接调 Electron 二进制,照抄脚本的引号处理 |
| 脚本完全没执行、连第一行输出都没有 | **PowerShell 5.1 读无 BOM 的 .ps1 按 ANSI 解码**,脚本里的中文/嵌套引号导致解析期失败 | 脚本保持纯 ASCII;正则先存变量再插值 |
| npm install esbuild 挂死 | 网络/代理 | 从 `dsh-whale-girl/node_modules/.pnpm` 复制 esbuild + `@esbuild/win32-x64` |
| 构建第三步失败 | 生成 `.d.ts` 的那次 esbuild **漏了 `external`** | 补上,产物 `lib/types/index.d.ts` 才会生成 |
| 客户端包 404 | 路由是图组合形式 `/plugins/??<id>/client.js&rev=`,不是 `/plugins/<id>/client.js` | 从 HTML 里抓真实 ref |

**共同点**:这些全都是"出错的命令一样返回 0"或"报了个和真实原因无关的错"。
唯一可靠的做法始终是**先问"这条命令能不能观测到我要验证的东西"**。

### 7.1 浏览器半边的四个坑(全部只在 Console 里可见)

| 症状 | 真实原因 | 修法 |
|---|---|---|
| `web boot: 1 entry did not activate` | `export const inject` 缺失,`ctx.locale` 抛 `cannot get property "locale" without inject` | 声明 `inject = ['slots','locale','configForms']` |
| 同上(重写文件后复发) | 重写 `index.tsx` 时把 `inject` 导出弄丢了 | 在 `apply` 外包 try/catch + `console.error`,让真实错误冒到 Console |
| 卡片渲染成"命名空间不可用" | slot 的 `inject` 面被**摊平进 props**,我返回的是 `{hooks:{scope}}`,组件读的是 `props.face` | `inject: () => ({ face })` |
| 列表里同一个编辑器出现两次、删除互相不认 | `plugins.item` 卡片**渲染两次**(列表摘要 + 详情页),两个实例各有独立 `useState` | 按 `props.view` 分支:摘要只读,编辑器只在详情页 |

> 第一条尤其值得记:Host 端**没有任何日志**能对应它。
> 唯一有效的做法就是给 `apply` 包一层 `console.error`——否则只能看到"1 entry did not activate"。

---


## 8. 明确没做的事

- **没有对桌面 profile 执行过 `sync --i-know-what-im-doing`**(一次都没有)
- **没有修改 `deepseek-harness` 里的任何文件**(全程只读)
- **没有在同一个失败上反复重试**(子代理在无执行通道时按此执行)
- **没有把没跑过的东西说成通过**
