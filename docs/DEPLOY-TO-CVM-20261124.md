# 白驹 ccowork · 推到腾讯云 Windows 服务器（CVM）操作手册

> 目标服务器：Windows CVM `ins-azx6p619`，公网 `1.15.51.92`，地域上海
> 瘦包：`ccowork-server-20261124.zip`（250.8 MB，2416 文件，含 server.mjs + 密钥）
> 服务端口：**8080**（以 `server.mjs` 代码为准，不是 README 里的 8787）
> 生成日期：2026-11-24

---

## 完整链路（4 步）

```
① 本地瘦包已备好  ✅（本文档同目录上一级：ccowork-server-20261124.zip）
② 把 zip 传到服务器
③ 服务器解压 + 装 Node + 常驻自启
④ 安全组放行 8080 + 域名 A 记录切到 1.15.51.92
```

---

## 第 ② 步：把 zip 传到服务器

三选一，按你顺手程度：

### 方式 A：远程桌面直接拖拽（最省事，250MB 建议用这个）
1. 在你已经连上的远程桌面窗口里，打开"此电脑"
2. 本地资源管理器找到 `C:\Users\35683\WorkBuddy\2026-08-21-20-57-16\ccowork-site\AI创作纪元\AI创作纪元\ccowork-server-20261124.zip`
3. 直接拖进远程桌面的服务器文件夹（如 `C:\`），等进度条走完

> 若拖拽没反应：远程桌面顶部连接栏 → "显示选项 → 本地资源 → 详细信息 → 磁盘"勾上本机 C 盘，重连后服务器里会出现 `\\tsclient\C\...`，用复制粘贴。

### 方式 B：腾讯云控制台「文件管理 / 自动化助手」
控制台 → 实例 → 自动化助手（TAT）→ 文件上传 → 选 zip 上传到服务器 `C:\`。

### 方式 C：对象存储 COS 中转
把 zip 传到 COS，服务器 PowerShell 里 `Invoke-WebRequest` 下载。适合上面两个都不通时。

---

## 第 ③ 步：服务器解压 + 装 Node + 常驻（核心）

在**服务器的 PowerShell**（不是你本机）逐段执行。建议用管理员 PowerShell。

### 3.1 解压

```powershell
# 假设 zip 已放在 C:\
$zip = 'C:\ccowork-server-20261124.zip'
$dest = 'C:\ccowork'
Expand-Archive -Path $zip -DestinationPath $dest -Force
cd $dest
dir server.mjs, package.json, ai.config.json
```

看到三个文件都列出来即成功。

### 3.2 安装 Node（服务器若已装可跳过验证）

```powershell
node -v
```

- 若输出 `v18` / `v20` / `v22` 等 → 已装，跳过安装。
- 若提示"无法识别" → 用 winget 装：

```powershell
winget install OpenJS.NodeJS.LTS
# 装完关掉 PowerShell 重新打开，再 node -v 确认
```

### 3.3 先手动跑一次，确认能起

```powershell
cd C:\ccowork
node server.mjs
```

另开一个服务器 PowerShell 验证：

```powershell
curl http://127.0.0.1:8080/api/health
curl -I http://127.0.0.1:8080/
```

- `/api/health` 返回 JSON（含 `ok` 或模型信息）→ 后端正常
- `/` 返回 200 → 静态站正常

确认后，回到跑 server 的那个 PowerShell 窗口按 `Ctrl+C` 停掉，进入 3.4 做常驻。

### 3.4 常驻自启（推荐用 Windows 任务计划，零额外依赖）

```powershell
# 用 schtasks 建一个开机自启 + 崩溃重启的任务
$action = New-ScheduledTaskAction -Execute "node.exe" `
  -Argument "server.mjs" -WorkingDirectory "C:\ccowork"
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName "ccowork-server" -Action $action `
  -Trigger $trigger -Settings $settings -RunLevel Highest -Force
Start-ScheduledTask -TaskName "ccowork-server"
```

验证：

```powershell
Get-ScheduledTask -TaskName ccowork-server | Select State
curl http://127.0.0.1:8080/api/health
```

`State = Running` 且 health 有响应 → 服务器侧彻底完成。

> 备选：装 PM2（`npm i -g pm2` + `pm2 start server.mjs` + `pm2 save` + `pm2 startup`），但 Windows 下 PM2 自启偶有坑，任务计划更稳。

---

## 第 ④ 步：外网放行 + 域名切换

### 4.1 安全组放行 8080（控制台操作）
实例 `ins-azx6p619` → 安全组 → 入站规则 → 添加：
- 协议端口：**TCP 8080**
- 来源：`0.0.0.0/0`（或只填你自己的家宽 IP 更安全）

放行后，从我这边或你本机浏览器测：
```
http://1.15.51.92:8080/
```
能打开首页即通。

### 4.2 域名 A 记录切到服务器
DNS 解析（你在域名商后台）把：
- `ccoworkbaiju.cn` → A 记录 → `1.15.51.92`
- `www.ccoworkbaiju.cn` → A 记录 → `1.15.51.92`（或 CNAME 到裸域）

> ⚠️ 当前用的是 8080 端口，裸域访问默认走 80。两个选择：
> - **临时**：域名后面带端口 `http://ccoworkbaiju.cn:8080` 访问，DNS 不用改别的；
> - **正规**：在服务器装 Nginx 反代 80 → 8080，或用 `netsh` 把 80 转发到 8080：
>   ```powershell
>   netsh interface portproxy add v4tov4 listenport=80 connectport=8080 connectaddress=127.0.0.1
>   ```
>   然后安全组放行 80，域名不带端口直接访问。

### 4.3 HTTPS（可后补）
 domestic 服务器需备案后才能开 80/443。你 ICP 号 `赣ICP备2026031925号` 已下，公安备案待下——按你之前决定"先上线后补公安"，先用 HTTP 跑起来，公安号下来后再补 HTTPS 与页脚。

---

## 验收清单

- [ ] zip 传到服务器并解压到 `C:\ccowork`
- [ ] `node -v` 有版本
- [ ] `curl http://127.0.0.1:8080/api/health` 有 JSON 响应
- [ ] `curl -I http://127.0.0.1:8080/` 返回 200
- [ ] 任务计划 `ccowork-server` 状态 Running
- [ ] 安全组放行 8080，`http://1.15.51.92:8080/` 外网可开
- [ ] 域名 A 记录指向 `1.15.51.92`，`http://ccoworkbaiju.cn:8080/` 可开
- [ ] （可选）80 端口转发 + 不带端口访问

---

## 风险与备注

- **密钥已随包到服务器**：`ai.config.json` 含星火 key，靠 `server.mjs` 的 DENY_FILE 挡浏览器直读，服务端持有是正确形态。但该 key 此前被 git 跟踪推到过公开仓库，**建议后续轮换一次**。
- **不要走 git clone**：远端 `github.com/ADlra567854/luoxuchun.git` 是公开仓库，会把密钥带到公网且 `.git` 有 496M。
- **deploy/ 已被重建为 Node 形态**：原静态发布流程若还要用，重新跑 `node scripts/prepare-deploy.mjs`（不带 `--with-server`）即可还原脱敏静态包。
