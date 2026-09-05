# VideoToPPT 🎬➡️📊

<div align="center">

**智能视频转PPT工具 - 基于 WebAV 和 FFmpeg 的现代化解决方案**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![WebAV](https://img.shields.io/badge/WebAV-FF6B35?style=for-the-badge&logo=webassembly&logoColor=white)](https://github.com/hughfenghen/WebAV)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white)](https://ffmpeg.org/)

[🚀 在线体验](https://video.liwenkai.fun) | [📖 使用教程](#-使用教程) | [🛠️ 本地部署](#本地部署) | [🤝 贡献指南](#-贡献指南)

</div>

---

## ✨ 功能特性

### 🎯 核心功能

| 功能 | 描述 |
|------|------|
| 🎥 **屏幕录制** | 实时屏幕录制，支持系统音频和麦克风 |
| 📁 **本地视频处理** | 上传本地视频文件进行智能分析 |
| 🧠 **智能帧提取** | 基于差异检测算法自动提取关键帧 |
| 📊 **PPT生成** | 按图片实际比例创建演示文稿，保持原始比例并避免二次压缩 |
| 🖼️ **图片预览** | 可滚动查看、删除并调整所有提取图片的顺序 |
| 📥 **批量下载** | 支持单张或 ZIP 批量下载，突破浏览器同时下载数量限制 |

### ✨ 增强版特性

当前版本针对真实 PPT 录屏场景进行了完整增强：

- 截图使用无损 PNG，并写入 300 DPI 元数据；PPT 导出时不重新压缩图片。
- 录屏和本地视频采用更高频率的画面检测，支持捕获连续动画和较短的页面变化。
- 首帧会立即捕获，视频扫描不会因短时间静止而提前结束。
- 自动识别并裁剪 4:3 PPT 在宽屏录制中的对称黑边，同时保留原始画面比例。
- PPT 页面比例由首张图片的实际宽高比决定，支持 4:3、16:9、16:10 及其他比例。
- 预览区支持删除不需要的图片和上移/下移排序，生成 PPT 与批量下载均使用最终列表。
- 所有处理均在浏览器本地完成，视频和截图不会上传到服务器。

### 🚀 技术亮点

- **🎨 现代化UI**: 现代设计风格，深色主题，流畅动画
- **⚡ 高性能处理**: WebCodecs + WebAssembly 提供原生级性能
- **🔒 隐私保护**: 纯客户端处理，数据不离开浏览器
- **📱 响应式设计**: 完美适配桌面端和移动端
- **🎛️ 智能算法**: 动态阈值计算，自动过滤相似帧
- **🛡️ 类型安全**: 完整的 TypeScript 类型系统

## 🛠️ 技术栈

### 前端框架
- **[Next.js 15](https://nextjs.org/)** - React框架，App Router
- **[TypeScript](https://www.typescriptlang.org/)** - 类型安全的JavaScript
- **[Tailwind CSS v4](https://tailwindcss.com/)** - 原子化CSS框架
- **[Shadcn/ui](https://ui.shadcn.com/)** - 高质量UI组件库

### 视频处理
- **[WebAV](https://github.com/hughfenghen/WebAV)** - 现代Web视频处理库
- **[FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm)** - 浏览器中的FFmpeg
- **[WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)** - 原生视频编解码

### UI/UX增强
- **[Lucide React](https://lucide.dev/)** - 精美的图标库
- **[Radix UI](https://www.radix-ui.com/)** - 无样式UI基础组件
- **[Class Variance Authority](https://cva.style/)** - 组件变体管理

## 📦 快速开始

### 环境要求

- **Node.js** 18.x 或更高版本
- **pnpm** 9.x 或 **npm** 10.x
- **现代浏览器** (Chrome 102+, Edge 102+)

### 本地部署

```bash
# 1. 克隆项目
git clone https://github.com/liwenka1/video-to-ppt.git
cd video-to-ppt

# 2. 安装依赖
pnpm install
# 或者使用 npm
npm install

# 3. 启动开发服务器
pnpm dev
# 或者使用 npm
npm run dev

# 4. 打开浏览器访问
open http://localhost:3000
```

### 生产部署

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## 🎮 使用教程

### 1. 屏幕录制模式

1. **准备录制**: 点击"准备录制"按钮
2. **选择屏幕**: 选择要录制的屏幕或窗口
3. **开始录制**: 点击"开始录制"开始捕获
4. **智能截图**: 系统自动检测画面变化并截图
5. **生成PPT**: 录制完成后一键生成PPT

### 2. 本地视频处理

1. **上传视频**: 拖拽或选择本地视频文件
2. **格式转换**: 自动转换为兼容格式（如需要）
3. **智能分析**: 提取关键帧，过滤相似内容
4. **预览确认**: 滚动查看所有提取的图片
5. **下载输出**: 生成PPT或批量下载图片

### 3. 图片管理功能 ✨

- **完整预览**: 可滚动查看所有提取的图片
- **批量下载**: 点击"下载全部"按钮获取ZIP文件
- **单张操作**: 悬浮图片显示下载和预览按钮
- **编号标识**: 每张图片显示序号便于定位

## 🏗️ 项目结构

```
video-to-ppt/
├── 📁 app/                      # Next.js App Router
│   ├── 📁 (site)/              # 网站页面组
│   │   └── 📄 page.tsx         # 首页
│   ├── 📁 local-video/         # 本地视频处理页面
│   │   └── 📄 page.tsx         # 本地视频上传与处理
│   ├── 📁 screen-recording/    # 屏幕录制页面
│   │   └── 📄 page.tsx         # 屏幕录制与截图
│   ├── 📄 layout.tsx           # 应用根布局
│   └── 📄 globals.css          # 全局样式
├── 📁 components/              # 可复用组件
│   └── 📁 ui/                  # Shadcn/ui 组件
├── 📁 lib/                     # 核心逻辑库
│   ├── 📄 video-processing.ts  # 视频处理核心算法
│   ├── 📄 video-diagnostics.ts # 视频诊断与兼容性检查
│   ├── 📄 ppt-generation.ts    # PPT生成逻辑
│   └── 📄 utils.ts             # 通用工具函数
├── 📁 data/                    # 数据配置
│   └── 📄 resume.tsx           # 项目信息与元数据
├── 📁 styles/                  # 样式文件
│   └── 📄 globals.css          # 全局CSS样式
├── 📁 public/                  # 静态资源
├── 📄 next.config.ts           # Next.js配置
├── 📄 tailwind.config.ts       # Tailwind CSS配置
└── 📄 package.json             # 项目依赖配置
```

## 🔧 核心算法

### 智能差异检测

```typescript
/**
 * 计算两个图像帧之间的差异度
 * 使用亮度值差异的均方根作为判断标准
 */
function calculateImageDifference(
  imgData1: ImageData,
  imgData2: ImageData
): number {
  let sumOfSquares = 0;
  const length = imgData1.data.length;

  for (let i = 0; i < length; i += 4) {
    // RGB转亮度值 (Rec. 709标准)
    const luminance1 = 0.2126 * imgData1.data[i] +
                      0.7152 * imgData1.data[i + 1] +
                      0.0722 * imgData1.data[i + 2];

    const luminance2 = 0.2126 * imgData2.data[i] +
                      0.7152 * imgData2.data[i + 1] +
                      0.0722 * imgData2.data[i + 2];

    const diff = luminance1 - luminance2;
    sumOfSquares += diff * diff;
  }

  return Math.sqrt(sumOfSquares / (length / 4));
}
```

### 动态阈值计算

```typescript
/**
 * 预处理视频计算最佳差异阈值
 * 基于视频内容动态调整，提高关键帧提取准确性
 */
async function preprocessVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): Promise<number> {
  const duration = video.duration;
  const sampleCount = Math.min(50, Math.max(20, Math.floor(duration / 10)));
  const differences: number[] = [];

  for (let i = 0; i < sampleCount - 1; i++) {
    // 计算采样帧间差异
    const time1 = (duration / sampleCount) * i;
    const time2 = (duration / sampleCount) * (i + 1);

    const diff = await calculateFrameDifference(video, canvas, time1, time2);
    differences.push(diff);
  }

  // 使用中位数作为基准阈值
  differences.sort((a, b) => a - b);
  const medianDiff = differences[Math.floor(differences.length / 2)];

  // 设置合理的阈值范围 [10, 60]
  return Math.max(10, Math.min(medianDiff, 60));
}
```

## 🎨 设计特色

### 现代设计风格

- **🎯 功能优先**: 清晰的视觉层次，直观的操作流程
- **🌙 深色主题**: 专业的深色配色方案，减少眼部疲劳
- **🌈 渐变背景**: 蓝色/紫色/青色动态渐变
- **💎 玻璃态效果**: backdrop-blur 和半透明元素
- **⚡ 流畅动画**: 自然的过渡效果和交互反馈

### 响应式设计

- **📱 移动优先**: Mobile-first 设计原则
- **🖥️ 桌面适配**: 大屏幕下的最佳体验
- **♿ 无障碍支持**: 支持键盘导航和屏幕阅读器
- **🎛️ 状态反馈**: 实时的处理状态和进度显示

## 🚨 故障排除

### 常见问题及解决方案

<details>
<summary><strong>🔧 FFmpeg 导入错误</strong></summary>

**错误信息**: `Module not found: Can't resolve '@ffmpeg/ffmpeg'`

**解决方案**:
```typescript
// next.config.ts 中的配置
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@ffmpeg/ffmpeg': '@ffmpeg/ffmpeg/dist/esm/index.js',
    };
    return config;
  },
};
```
</details>

<details>
<summary><strong>🌐 WebAV 类型错误</strong></summary>

**错误信息**: `Cannot find module '@webav/av-cliper'`

**解决方案**:
```bash
# 确保安装正确版本
pnpm add @webav/av-cliper@latest
```
</details>

<details>
<summary><strong>🛡️ SharedArrayBuffer 错误</strong></summary>

**错误信息**: `SharedArrayBuffer is not defined`

**解决方案**: 确保在 HTTPS 环境下运行，或使用 Chrome 开启相关特性:
```bash
# 开发环境启动参数
chrome --enable-features=SharedArrayBuffer
```
</details>

<details>
<summary><strong>🎥 视频格式不支持</strong></summary>

**解决方案**: 工具会自动检测并转换格式，支持的输入格式:
- MP4, WebM, MOV, AVI, MKV, WMV, FLV, 3GP, OGV
</details>

## 🤝 贡献指南

我们欢迎所有形式的贡献！无论是报告Bug、提出新功能建议，还是提交代码。

### 🛠️ 开发指南

```bash
# 1. Fork 项目并克隆
git clone https://github.com/your-username/video-to-ppt.git

# 2. 创建功能分支
git checkout -b feature/amazing-feature

# 3. 提交更改
git commit -m 'feat: add amazing feature'

# 4. 推送分支
git push origin feature/amazing-feature

# 5. 创建 Pull Request
```

### 📝 代码规范

- **TypeScript**: 使用严格的类型检查
- **ESLint**: 遵循项目ESLint配置
- **Prettier**: 统一代码格式化
- **Conventional Commits**: 规范化提交信息

## 📄 许可证

本项目采用 [MIT](./LICENSE) 许可证 - 查看 [LICENSE](./LICENSE) 文件了解详情。

## 🙏 致谢

本项目的灵感来源于 [video2ppt.com](https://video2ppt.com/)，感谢他们提供的优秀创意和解决方案。

## 📊 项目状态

![GitHub Stars](https://img.shields.io/github/stars/liwenka1/video-to-ppt?style=social)
![GitHub Forks](https://img.shields.io/github/forks/liwenka1/video-to-ppt?style=social)
![GitHub Issues](https://img.shields.io/github/issues/liwenka1/video-to-ppt)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/liwenka1/video-to-ppt)

---

<div align="center">

**🌟 如果这个项目对您有帮助，请给它一个 Star！**

[⬆️ 回到顶部](#videotoppt-️)

Made with ❤️ by [liwenka1](https://github.com/liwenka1)

</div>
