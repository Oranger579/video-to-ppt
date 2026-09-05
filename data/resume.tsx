import type { Metadata } from "next";
import { Github, Video } from "lucide-react";

// 网站元数据配置
export const SiteMetadata: Metadata = {
	title: "VideoToPPT Enhanced - 智能视频转PPT工具",
	description: "基于 WebAV 和 FFmpeg 的现代化视频分析与 PPT 生成工具，支持屏幕录制、本地视频处理和在线视频分析",
	keywords: ["视频转PPT", "WebAV", "FFmpeg", "屏幕录制", "视频分析", "PPT生成", "智能转换"],
	authors: [{ name: "Oranger579" }],
	creator: "Oranger579",
	publisher: "Oranger579",
	openGraph: {
		title: "VideoToPPT Enhanced - 智能视频转PPT工具",
		description: "基于 WebAV 和 FFmpeg 的现代化视频分析与 PPT 生成工具",
		type: "website",
		locale: "zh_CN",
	},
	twitter: {
		card: "summary_large_image",
		title: "VideoToPPT Enhanced - 智能视频转PPT工具",
		description: "基于 WebAV 和 FFmpeg 的现代化视频分析与 PPT 生成工具",
		creator: "@Oranger579",
	},
	robots: {
		index: true,
		follow: true,
	},
};

// 项目信息配置
export const ProjectInfo = {
	name: "VideoToPPT Enhanced",
	tagline: "面向真实PPT录屏场景的增强版视频转PPT工具",
	description:
		"在原版 VideoToPPT 基础上增强截图质量、动画检测、比例适配和截图管理，支持屏幕录制、本地视频处理和在线视频分析",
	version: "1.1.0-enhanced",
	repository: {
		type: "github",
		url: "https://github.com/Oranger579/video-to-ppt",
		name: "video-to-ppt",
	},
	upstream: {
		name: "liwenka1/video-to-ppt",
		url: "https://github.com/liwenka1/video-to-ppt",
	},
	maintainer: {
		name: "Oranger579",
		url: "https://github.com/Oranger579",
	},
	features: [
		"智能视频分析",
		"动画与首帧检测",
		"原比例PPT生成",
		"截图删除与排序",
		"多格式支持",
		"屏幕录制",
		"本地处理",
		"隐私保护",
	],
	technologies: ["TypeScript", "Next.js 15", "WebAV", "FFmpeg.wasm", "Tailwind CSS", "Shadcn/ui"],
	license: "MIT",
} as const;

// 个人信息配置
export const ResumeData = {
	personal: {
		name: "Oranger579",
		title: "Full Stack Developer",
		bio: "VideoToPPT Enhanced 维护者，专注于现代化 Web 技术与视频处理体验",
	},
	contact: {
		social: {
			GitHub: {
				name: "GitHub",
				url: "https://github.com/Oranger579",
				icon: Github,
				username: "@Oranger579",
			},
		},
	},
	projects: {
		featured: {
			name: ProjectInfo.name,
			description: ProjectInfo.description,
			url: ProjectInfo.repository.url,
			icon: Video,
			technologies: ProjectInfo.technologies,
			features: ProjectInfo.features,
		},
	},
} as const;

// 导出类型定义
export type ProjectInfoType = typeof ProjectInfo;
export type ResumeDataType = typeof ResumeData;
