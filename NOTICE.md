# 来源与增强说明

本项目 `VideoToPPT Enhanced` 基于原项目 [liwenka1/video-to-ppt](https://github.com/liwenka1/video-to-ppt) 开发。

原项目的 MIT 许可证、版权声明、基础项目结构和依赖方案均予以保留。请参阅根目录 [LICENSE](./LICENSE) 文件。

当前仓库由 [Oranger579](https://github.com/Oranger579) 维护，主要增强包括：

- 使用无损 PNG 保存截图，保留 DPI 元数据，并避免 PPT 导出时二次压缩；
- 改进首帧、动画和长视频画面检测；
- 自动裁剪 4:3 PPT 在宽屏录制中的对称黑边；
- 根据图片实际比例创建 PPT 页面，避免图片拉伸变形；
- 在截图预览区增加删除、上移、下移和 ZIP 批量下载；
- 修复 PPT 导出、对象 URL 图片嵌入和批量下载相关问题。

这些增强内容属于当前仓库的独立修改，不代表原作者已经合并或官方认可。针对通用修复和功能改进，已向原项目提交 Pull Request。
