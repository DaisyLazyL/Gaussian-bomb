# gaussian-smash

Gaussian Smash 是一个用手势直接编辑 3D Gaussian 场景的 Hackday 原型。你可以导入 `.ply`、`.splat`、`.ksplat` 场景，用摄像头识别手势去捏、锤、移动、变形、删除高斯点，也可以进入挑战模式和朋友比谁把同一个场景捏得更有创意。

## 在线体验

```text
https://daisylazyl.github.io/gaussian-smash/
```

## 当前能力

- 导入本地 3DGS 场景文件：`.ply`、`.splat`、`.ksplat`
- 内置场景选择：上海办公室、Gaussians、日式园林、矩阵园区
- 手势编辑：
  - 捏合：抓取并编辑一簇高斯点
  - 拳头锤：向下锤击，快速打散/压碎高斯点
  - 双手缩放：双手靠近或远离来缩放视图
  - OK 手势：长按约 1 秒切换自由模式 / 行走模式
- 两种主模式：
  - 自由模式：围绕场景做塑形、移动、擦除、上色
  - 行走模式：在高斯场景里漫游
- 行走控制：
  - 单手张掌前进
  - 双手后退
  - 捏合转头
  - 键盘 `WASD` 行走
- 创意对战：
  - Host 选择或上传同一个场景
  - 复制邀请链接给朋友
  - 每人输入昵称，各自挑战
  - 每人 3 次机会，每次 15 秒
  - 取最高分进入排行榜
  - 每个房间/场景单独计分
- 摄像头面具：
  - 使用 MediaPipe Face Landmarker 跟随人脸
  - 内置 Thanos、Iron Man、Joker、Web Hero、Tiny Officer、Pixel Face、Star Pilot 等角色风格
- 视频录制：
  - 顶部轻量录制入口
  - 录制 3D 画布和摄像头小窗表现
  - 生成 WebM，可下载或分享
- 中英文切换
- 摄像头不可用时支持 `Shift + 拖拽` 作为演示备用交互

## 手势速查

| 场景 | 手势 / 操作 | 效果 |
| --- | --- | --- |
| 自由模式 | 捏合拇指和食指 | 抓取高斯点簇并编辑 |
| 自由模式 | 握拳后向下锤 | 锤击并打散高斯点 |
| 自由模式 | 张开手移动 | 旋转查看场景 |
| 任意模式 | 双手靠近 / 远离 | 缩放视图 |
| 任意模式 | OK 手势保持约 1 秒 | 切换自由模式和行走模式 |
| 行走模式 | 单手张掌 | 前进 |
| 行走模式 | 双手同时出现 | 后退 |
| 行走模式 | 捏合并移动 | 转头 / 调整方向 |
| 行走模式 | `WASD` | 键盘行走 |

## 本地运行

需要本机安装 Node.js。

```bash
npm install
npm start
```

或：

```bash
yarn
yarn dev
```

然后打开：

```text
http://localhost:5174/
```

## 摄像头说明

浏览器摄像头在正式环境里通常要求 HTTPS，`localhost` 例外。

- 本地开发：`http://localhost:5174/` 可以打开摄像头
- 线上 HTTP：摄像头可能打不开
- 线上部署：建议使用 HTTPS 域名

本项目通过浏览器加载 MediaPipe Tasks Vision：

- Hand Landmarker / Gesture Recognizer：手势识别
- Face Landmarker：人脸面具跟踪

## 内置场景和大文件说明

当前内置场景是大体积 PLY 文件：

| 场景 | 大小 |
| --- | ---: |
| 上海办公室 | 约 72 MB |
| 日式园林 | 约 101 MB |
| Gaussians | 约 157 MB |
| 矩阵园区 | 约 206 MB |

这些文件目前通过 GitHub media 链接加载。它能工作，但首次加载会比较慢，尤其是 100 MB 以上的场景。页面已经增加下载进度反馈，点击内置场景后会显示正在下载的 MB 数。

更适合长期使用的资源托管方式：

- 对象存储 / CDN，并开启 HTTPS 和 CORS
- 或准备 10-30 MB 的轻量场景作为现场 demo 默认资源

注意：不要依赖 LiteApp 容器里的 Git LFS 文件作为内置场景源。LiteApp 构建环境可能拿到的是 LFS 指针文件，不是真正的 PLY 大文件。

## 部署到 LiteApp

LiteApp 配置建议：

| 配置项 | 值 |
| --- | --- |
| Runtime | Node.js 20 |
| HTTP Port | `5174` |
| Prepare command | `npm install` |
| Start command | `npm start` |

项目服务由 `server.js` 启动，同时提供：

- 静态页面和前端资源
- 房间接口
- 分数排行榜接口
- Host 上传挑战场景接口

当前排行榜和房间数据保存在服务进程内存中，适合 Hackday demo。如果服务重启，房间和分数会清空。正式化时可以接数据库、对象存储或 Redis。

## 项目结构

```text
.
├── index.html          # 应用页面结构
├── src/
│   ├── app.js          # 主要交互、渲染、手势、比赛逻辑
│   └── styles.css      # 页面样式
├── server.js           # 本地/LiteApp Node 服务
├── scenes/             # 本地大场景文件，Git LFS 管理
├── assets/             # 静态素材
└── validation/         # 验证素材/记录
```

## 已知限制

- 当前渲染是面向 Hackday 原型的 WebGL 点云/高斯预览，不是完整 SuperSplat 级别的 3DGS splat renderer。
- 大 PLY 文件下载和浏览器解析都比较耗时。
- 线上摄像头需要 HTTPS。
- LiteApp 无持久化存储，挑战房间和排行榜重启后会丢失。
- GitHub Releases 附件不适合作为网页内 `fetch()` 的场景源，因为它的最终下载响应通常没有浏览器跨域读取所需的 CORS 头。

## GitHub

Repository:

```text
https://github.com/DaisyLazyL/gaussian-smash
```
