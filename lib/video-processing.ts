import type { RefObject } from "react";

import { calculateImageDifference } from "./utils";

// Screenshots are used as presentation source images, so keep the original
// canvas pixels instead of introducing JPEG compression artifacts. PNG is
// lossless and the browser ignores the optional quality argument for it.
const SCREENSHOT_MIME_TYPE = "image/png";
const SCREENSHOT_DPI = 300;

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of bytes) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit++) {
			crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
		}
	}
	return (crc ^ 0xffffffff) >>> 0;
}

/** Add a standard PNG pHYs chunk without re-encoding any image pixels. */
async function addPngDpi(blob: Blob, dpi: number): Promise<Blob> {
	const bytes = new Uint8Array(await blob.arrayBuffer());
	if (bytes.length < PNG_SIGNATURE.length || !PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
		return blob;
	}

	const chunks: Uint8Array[] = [];
	let offset = PNG_SIGNATURE.length;
	let inserted = false;
	const pixelsPerMeter = Math.round(dpi / 0.0254);
	const physData = new Uint8Array(9);
	const physView = new DataView(physData.buffer);
	physView.setUint32(0, pixelsPerMeter);
	physView.setUint32(4, pixelsPerMeter);
	physData[8] = 1;

	while (offset + 12 <= bytes.length) {
		const chunkLength = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
		const chunkEnd = offset + 12 + chunkLength;
		if (chunkEnd > bytes.length) return blob;
		const chunkType = new TextDecoder().decode(bytes.subarray(offset + 4, offset + 8));
		if (chunkType !== "pHYs") {
			const chunk = bytes.slice(offset, chunkEnd);
			chunks.push(chunk);
			if (chunkType === "IHDR" && !inserted) {
				const type = new TextEncoder().encode("pHYs");
				const chunkBody = new Uint8Array(type.length + physData.length);
				chunkBody.set(type);
				chunkBody.set(physData, type.length);
				const physChunk = new Uint8Array(12 + physData.length);
				new DataView(physChunk.buffer).setUint32(0, physData.length);
				physChunk.set(chunkBody, 4);
				new DataView(physChunk.buffer).setUint32(4 + chunkBody.length, crc32(chunkBody));
				chunks.push(physChunk);
				inserted = true;
			}
		}
		offset = chunkEnd;
		if (chunkType === "IEND") break;
	}

	const output = new Uint8Array(PNG_SIGNATURE.length + chunks.reduce((total, chunk) => total + chunk.length, 0));
	output.set(PNG_SIGNATURE);
	let outputOffset = PNG_SIGNATURE.length;
	for (const chunk of chunks) {
		output.set(chunk, outputOffset);
		outputOffset += chunk.length;
	}
	return new Blob([output], { type: SCREENSHOT_MIME_TYPE });
}

function isMostlyBlackLine(data: Uint8ClampedArray, offsets: number[]): boolean {
	let blackPixels = 0;
	let luminanceTotal = 0;

	for (const offset of offsets) {
		const luminance = 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
		luminanceTotal += luminance;
		if (luminance <= 24) blackPixels++;
	}

	return blackPixels / offsets.length >= 0.98 && luminanceTotal / offsets.length <= 12;
}

function areSymmetricBars(first: number, second: number, dimension: number): boolean {
	if (first < 2 || second < 2) return false;
	return Math.abs(first - second) <= Math.max(4, Math.round(dimension * 0.01));
}

/** Remove only solid black letterbox bars, preserving the actual frame pixels. */
function cropBlackBars(canvas: HTMLCanvasElement): HTMLCanvasElement {
	const width = canvas.width;
	const height = canvas.height;
	if (width < 8 || height < 8) return canvas;

	const context = canvas.getContext("2d");
	if (!context) return canvas;

	const sample = context.getImageData(0, 0, width, height);
	const data = sample.data;
	const sampleXStep = Math.max(1, Math.floor(width / 160));
	const sampleYStep = Math.max(1, Math.floor(height / 160));
	const isBlackRow = (y: number) => {
		const offsets: number[] = [];
		for (let x = 0; x < width; x += sampleXStep) offsets.push((y * width + x) * 4);
		return isMostlyBlackLine(data, offsets);
	};
	const isBlackColumn = (x: number) => {
		const offsets: number[] = [];
		for (let y = 0; y < height; y += sampleYStep) offsets.push((y * width + x) * 4);
		return isMostlyBlackLine(data, offsets);
	};
	const maxHorizontalCrop = Math.floor(width * 0.2);
	const maxVerticalCrop = Math.floor(height * 0.2);
	let left = 0;
	let right = width - 1;
	let top = 0;
	let bottom = height - 1;

	while (top < maxVerticalCrop && isBlackRow(top)) top++;
	while (height - 1 - bottom < maxVerticalCrop && isBlackRow(bottom)) bottom--;
	while (left < maxHorizontalCrop && isBlackColumn(left)) left++;
	while (width - 1 - right < maxHorizontalCrop && isBlackColumn(right)) right--;

	const horizontalBarsDetected =
		top < maxVerticalCrop &&
		height - 1 - bottom < maxVerticalCrop &&
		areSymmetricBars(top, height - 1 - bottom, height);
	const verticalBarsDetected =
		left < maxHorizontalCrop &&
		width - 1 - right < maxHorizontalCrop &&
		areSymmetricBars(left, width - 1 - right, width);

	if (!horizontalBarsDetected) {
		top = 0;
		bottom = height - 1;
	}
	if (!verticalBarsDetected) {
		left = 0;
		right = width - 1;
	}

	if (left === 0 && right === width - 1 && top === 0 && bottom === height - 1) return canvas;

	const cropped = document.createElement("canvas");
	cropped.width = right - left + 1;
	cropped.height = bottom - top + 1;
	cropped
		.getContext("2d")
		?.drawImage(canvas, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
	return cropped;
}

async function canvasToScreenshotBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
	const sourceCanvas = cropBlackBars(canvas);
	const blob = await new Promise<Blob | null>((resolve) => sourceCanvas.toBlob(resolve, SCREENSHOT_MIME_TYPE));
	return blob ? addPngDpi(blob, SCREENSHOT_DPI) : null;
}

async function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
	const maximumTime = Number.isFinite(video.duration) ? Math.max(video.duration - 0.001, 0) : time;
	const targetTime = Math.min(Math.max(time, 0), maximumTime);

	if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && Math.abs(video.currentTime - targetTime) < 0.001) {
		return;
	}

	await new Promise<void>((resolve, reject) => {
		const controller = new AbortController();
		video.addEventListener(
			"seeked",
			() => {
				controller.abort();
				resolve();
			},
			{ signal: controller.signal }
		);
		video.addEventListener(
			"error",
			() => {
				controller.abort();
				reject(new Error("Unable to seek video"));
			},
			{ signal: controller.signal }
		);

		try {
			video.currentTime = targetTime;
		} catch (error) {
			controller.abort();
			reject(error);
		}
	});
}

function emitCanvasScreenshot(canvas: HTMLCanvasElement, onScreenshotCaptured: (screenshot: string) => void): void {
	void canvasToScreenshotBlob(canvas)
		.then((blob) => {
			if (blob) onScreenshotCaptured(URL.createObjectURL(blob));
		})
		.catch((error) => console.error("Screenshot encoding failed:", error));
}

interface CaptureScreenshotParams {
	videoRef: RefObject<HTMLVideoElement>;
	canvasRef: RefObject<HTMLCanvasElement>;
	lastImageDataRef: RefObject<ImageData | null>;
	diffThreshold: number;
	onScreenshotCaptured: (screenshot: string) => void;
	onStatsUpdate: () => void;
}

export function captureAndFilterScreenshot({
	videoRef,
	canvasRef,
	lastImageDataRef,
	diffThreshold,
	onScreenshotCaptured,
	onStatsUpdate,
}: CaptureScreenshotParams): void {
	const video = videoRef.current;
	const canvas = canvasRef.current;

	if (!video || !canvas) return;

	const context = canvas.getContext("2d");
	if (!context) return;

	// Set canvas dimensions to match video
	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;

	// Draw current video frame to canvas
	context.drawImage(video, 0, 0, canvas.width, canvas.height);
	const currentImageData = context.getImageData(0, 0, canvas.width, canvas.height);

	onStatsUpdate();

	let shouldCapture = false;

	// Compare against the last saved frame. Small animation steps can then
	// accumulate instead of being lost between adjacent samples.
	if (lastImageDataRef.current) {
		const difference = calculateImageDifference(lastImageDataRef.current, currentImageData);
		shouldCapture = difference > diffThreshold;
	} else {
		shouldCapture = true;
	}

	if (shouldCapture) {
		emitCanvasScreenshot(canvas, onScreenshotCaptured);
		lastImageDataRef.current = currentImageData;
	}
}

export function updateCanvasWithScreenshot(canvasRef: RefObject<HTMLCanvasElement>, screenshotUrl: string): void {
	const canvas = canvasRef.current;
	if (!canvas) return;

	const context = canvas.getContext("2d");
	if (!context) return;

	const img = new Image();
	img.onload = () => {
		canvas.width = img.width;
		canvas.height = img.height;
		context.drawImage(img, 0, 0);
	};
	img.src = screenshotUrl;
}

// WebAV-based video processing functions
export async function processVideoWithWebAV(videoFile: File): Promise<{
	frames: string[];
	duration: number;
	scenes: Array<{
		startTime: number;
		endTime: number;
		thumbnail: string;
	}>;
}> {
	// Check if we're on the client side
	if (typeof window === "undefined") {
		throw new Error("WebAV processing can only be used on the client side");
	}

	try {
		// Dynamic import WebAV modules only on client side
		const { MP4Clip } = await import("@webav/av-cliper");

		// Create MP4Clip from file
		const mp4Clip = new MP4Clip(videoFile.stream());

		// Get video metadata
		const { duration } = await mp4Clip.ready;

		// Create frames array
		const frames: string[] = [];
		const scenes: Array<{
			startTime: number;
			endTime: number;
			thumbnail: string;
		}> = [];

		// Extract frames at regular intervals
		const frameInterval = Math.max(0.5, duration / 1e6 / 200); // Sample animations while capping at 200 frames
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");

		if (!context) {
			throw new Error("Cannot create canvas context");
		}

		for (let time = 0; time < duration; time += frameInterval * 1e6) {
			const { video } = await mp4Clip.tick(time);

			if (video) {
				// Set canvas size to match video frame
				canvas.width = video.displayWidth;
				canvas.height = video.displayHeight;

				// Draw video frame to canvas
				context.clearRect(0, 0, canvas.width, canvas.height);
				context.drawImage(video, 0, 0);

				// Convert to blob and create URL
				const blob = await canvasToScreenshotBlob(canvas);

				if (blob) {
					const frameUrl = URL.createObjectURL(blob);
					frames.push(frameUrl);

					// Create scene data for every 10 seconds
					if (frames.length % 10 === 0) {
						scenes.push({
							startTime: time / 1e6,
							endTime: Math.min((time + frameInterval * 10 * 1e6) / 1e6, duration / 1e6),
							thumbnail: frameUrl,
						});
					}
				}

				// Close the video frame
				video.close();
			}
		}

		return { frames, duration: duration / 1e6, scenes };
	} catch (error) {
		console.error("Error processing video with WebAV:", error);
		throw error;
	}
}

// Traditional frame extraction (fallback method)
export async function extractFramesFromVideo(
	video: HTMLVideoElement,
	canvas: HTMLCanvasElement,
	options: {
		captureInterval: number;
		differenceThreshold: number;
		maxScreenshots: number;
	},
	callbacks: {
		onProgress: (progress: number) => void;
		onFrameCaptured: (blob: Blob, url: string) => void;
		onComplete: (screenshots: Blob[]) => void;
	}
): Promise<void> {
	const { captureInterval, differenceThreshold, maxScreenshots } = options;
	const { onProgress, onFrameCaptured, onComplete } = callbacks;

	const context = canvas.getContext("2d");
	if (!context) return;

	// Set canvas dimensions
	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;

	let currentTime = 0;
	const totalDuration = video.duration;
	if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
		throw new Error("Video duration is unavailable");
	}
	let lastCapturedImageData: ImageData | null = null;
	const screenshots: Blob[] = [];

	const captureFrame = async (time: number): Promise<void> => {
		await seekVideo(video, time);
		context.drawImage(video, 0, 0, canvas.width, canvas.height);
		const currentImageData = context.getImageData(0, 0, canvas.width, canvas.height);
		const shouldCapture =
			!lastCapturedImageData || calculateImageDifference(lastCapturedImageData, currentImageData) > differenceThreshold;

		if (!shouldCapture || screenshots.length >= maxScreenshots) return;

		const blob = await canvasToScreenshotBlob(canvas);
		if (blob) {
			screenshots.push(blob);
			onFrameCaptured(blob, URL.createObjectURL(blob));
			lastCapturedImageData = currentImageData;
		}
	};

	// Extract frames
	while (currentTime < totalDuration && screenshots.length < maxScreenshots) {
		await captureFrame(currentTime);

		// Update progress
		const progress = Math.round((currentTime / totalDuration) * 100);
		onProgress(progress);

		currentTime += captureInterval;
	}

	onComplete(screenshots);
}

// Enhanced helper to get file extension from MIME type
function getExtensionFromMime(mimeType: string): string | null {
	const mimeMap: Record<string, string> = {
		"video/webm": "webm",
		"video/quicktime": "mov",
		"video/x-msvideo": "avi",
		"video/mp4": "mp4",
		"video/x-matroska": "mkv",
		"video/3gpp": "3gp",
		"video/x-flv": "flv",
		"video/x-ms-wmv": "wmv",
		"video/ogg": "ogv",
		"video/x-ms-asf": "asf",
		"video/x-f4v": "f4v",
		"video/x-m4v": "m4v",
		"audio/mp4": "m4a",
		"audio/webm": "weba",
		"audio/ogg": "ogg",
		"audio/mpeg": "mp3",
		"audio/wav": "wav",
		"audio/x-flac": "flac",
		"audio/aac": "aac",
	};

	return mimeMap[mimeType.toLowerCase()] || null;
}

// New helper to detect format from file content
function getExtensionFromBlob(blob: Blob): string | null {
	// This is a basic implementation - in a real scenario, you might want to read file headers
	const name = (blob as any).name;
	if (name && typeof name === "string") {
		const ext = name.split(".").pop()?.toLowerCase();
		if (ext) return ext;
	}
	return null;
}

// FFmpeg conversion utilities (client-side only)
export async function convertToMp4(
	inputBlob: Blob,
	onProgress?: (progress: number) => void,
	inputFormat?: string
): Promise<Blob> {
	// Check if we're on the client side
	if (typeof window === "undefined") {
		throw new Error("FFmpeg can only be used on the client side");
	}

	try {
		// Dynamic import for FFmpeg to avoid SSR issues
		const { FFmpeg } = await import("@ffmpeg/ffmpeg");
		const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

		const ffmpeg = new FFmpeg();

		// Initialize tracking variables before setting up callbacks
		let totalDuration: number | null = null;
		let frameCount = 0;
		let lastProgressUpdate = 0;

		// Enhanced logging and progress parsing
		ffmpeg.on("log", ({ message }) => {
			console.log("FFmpeg log:", message);

			// Simple activity indicator instead of complex progress calculation
			if (message.includes("frame=") && onProgress) {
				const frameMatch = message.match(/frame=\s*(\d+)/);
				if (frameMatch) {
					frameCount = parseInt(frameMatch[1]);

					// Simple activity indicator - just show we're working
					// Progress stages: 20% -> 40% -> 60% -> 80% based on activity
					const now = Date.now();
					if (now - lastProgressUpdate > 2000) {
						// Update every 2 seconds
						if (frameCount > 0 && frameCount < 100) {
							onProgress(20); // Starting
						} else if (frameCount >= 100 && frameCount < 300) {
							onProgress(40); // Processing
						} else if (frameCount >= 300 && frameCount < 600) {
							onProgress(60); // Continuing
						} else if (frameCount >= 600) {
							onProgress(80); // Almost done
						}
						lastProgressUpdate = now;
						console.log(`Processing frames: ${frameCount}`);
					}
				}
			}
		});

		if (onProgress) {
			ffmpeg.on("progress", ({ progress }: { progress: number }) => {
				// Fallback progress handling if the log parsing doesn't work
				const progressPercent =
					typeof progress === "number" && isFinite(progress)
						? Math.max(0, Math.min(100, Math.round(progress * 100)))
						: 0;
				if (progressPercent > 0) {
					onProgress(progressPercent);
				}
			});
		}

		// Load FFmpeg with enhanced error handling
		console.log("Loading FFmpeg...");
		const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

		try {
			await ffmpeg.load({
				coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
				wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
			});
		} catch {
			console.error("Failed to load from unpkg, trying alternative CDN...");
			// Fallback to alternative CDN
			const altBaseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
			await ffmpeg.load({
				coreURL: await toBlobURL(`${altBaseURL}/ffmpeg-core.js`, "text/javascript"),
				wasmURL: await toBlobURL(`${altBaseURL}/ffmpeg-core.wasm`, "application/wasm"),
			});
		}

		console.log("FFmpeg loaded successfully");

		// Enhanced format detection
		const inputExt = inputFormat || getExtensionFromMime(inputBlob.type) || getExtensionFromBlob(inputBlob) || "webm";
		const inputFileName = `input.${inputExt}`;
		const outputFileName = "output.mp4";

		console.log(`Converting ${inputFileName} to ${outputFileName}, size: ${inputBlob.size} bytes`);

		// Performance monitoring
		const startTime = Date.now();

		// Try to get video metadata from blob before conversion
		try {
			const videoElement = document.createElement("video");
			const blobUrl = URL.createObjectURL(inputBlob);
			videoElement.src = blobUrl;

			await new Promise<void>((resolve) => {
				videoElement.addEventListener("loadedmetadata", () => {
					if (videoElement.duration && isFinite(videoElement.duration)) {
						totalDuration = videoElement.duration;
						console.log(`Video duration from metadata: ${totalDuration} seconds`);
					}
					URL.revokeObjectURL(blobUrl);
					resolve();
				});

				videoElement.addEventListener("error", () => {
					console.log("Could not load video metadata, will estimate during conversion");
					URL.revokeObjectURL(blobUrl);
					resolve();
				});

				// Timeout after 2 seconds
				setTimeout(() => {
					console.log("Metadata loading timeout, proceeding with conversion");
					URL.revokeObjectURL(blobUrl);
					resolve();
				}, 2000);
			});
		} catch (error) {
			console.log("Error getting video metadata:", error);
		}

		// Write input file
		await ffmpeg.writeFile(inputFileName, await fetchFile(inputBlob));

		// Strategy: Try copy first for maximum speed, simple fallback if needed
		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(() => reject(new Error("Conversion timeout after 5 minutes")), 5 * 60 * 1000);
		});

		// First attempt: Try copy for maximum speed
		const copyCommand = ["-i", inputFileName, "-c", "copy", "-movflags", "+faststart", "-f", "mp4", outputFileName];

		console.log(`⚡ Trying fast copy:`, copyCommand.join(" "));

		let copySucceeded = false;
		try {
			const copyPromise = ffmpeg.exec(copyCommand);
			await Promise.race([copyPromise, timeoutPromise]);
			copySucceeded = true;
			console.log("✅ Copy conversion succeeded!");
		} catch {
			console.log("❌ Copy failed, falling back to re-encoding...");
		}

		// If copy failed, use simple re-encoding
		if (!copySucceeded) {
			// Simple, fast re-encoding as fallback
			const fallbackCommand = [
				"-i",
				inputFileName,
				"-c:v",
				"libx264",
				"-preset",
				"fast",
				"-crf",
				"23",
				"-c:a",
				"aac",
				"-b:a",
				"128k",
				"-movflags",
				"+faststart",
				outputFileName,
			];

			console.log(`🔄 Re-encoding fallback:`, fallbackCommand.join(" "));

			try {
				const conversionPromise = ffmpeg.exec(fallbackCommand);
				await Promise.race([conversionPromise, timeoutPromise]);
				console.log("✅ Fallback conversion succeeded!");
			} catch (error) {
				console.log("❌ Fallback failed:", error);
				throw error;
			}
		}

		// Read the result
		const data = await ffmpeg.readFile(outputFileName);

		if (!data || (data as Uint8Array).length === 0) {
			throw new Error("Conversion produced empty output");
		}

		const mp4Blob = new Blob([data as BlobPart], { type: "video/mp4" });

		// Final progress update
		if (onProgress) {
			onProgress(100);
			console.log("Progress: 100% (conversion completed)");
		}

		const endTime = Date.now();
		const conversionTime = (endTime - startTime) / 1000;
		const compressionRatio = (((inputBlob.size - mp4Blob.size) / inputBlob.size) * 100).toFixed(1);

		console.log(`Conversion completed in ${conversionTime.toFixed(1)}s`);
		console.log(
			`Input: ${(inputBlob.size / 1024 / 1024).toFixed(2)}MB → Output: ${(mp4Blob.size / 1024 / 1024).toFixed(2)}MB`
		);
		console.log(`Compression: ${compressionRatio}% size reduction`);

		// Cleanup
		try {
			await ffmpeg.deleteFile(inputFileName);
			await ffmpeg.deleteFile(outputFileName);
		} catch (cleanupError) {
			console.warn("Cleanup error:", cleanupError);
		}

		await ffmpeg.terminate();

		return mp4Blob;
	} catch (error) {
		console.error("Error converting to MP4:", error);

		// Enhanced error messages
		if (error instanceof Error) {
			if (error.message.includes("SharedArrayBuffer")) {
				throw new Error("浏览器不支持SharedArrayBuffer，请在HTTPS环境下使用或启用相关浏览器特性");
			} else if (error.message.includes("network")) {
				throw new Error("网络错误：无法下载FFmpeg组件，请检查网络连接");
			} else if (error.message.includes("memory")) {
				throw new Error("内存不足：文件太大，请尝试较小的文件或刷新页面重试");
			} else if (error.message.includes("timeout")) {
				throw new Error("转换超时：文件处理时间过长，请尝试较小的文件");
			}
		}

		throw error;
	}
}

export interface VideoAnalysisResult {
	keyFrames: string[];
	scenes: Array<{
		startTime: number;
		endTime: number;
		thumbnail: string;
	}>;
	audioAnalysis?: {
		hasAudio: boolean;
		peaks: number[];
	};
}

// Advanced video analysis using WebAV
export async function analyzeVideoContent(videoFile: File | Blob): Promise<VideoAnalysisResult> {
	// Check if we're on the client side
	if (typeof window === "undefined") {
		throw new Error("Video analysis can only be performed on the client side");
	}

	try {
		// Convert Blob to File if needed
		const file = videoFile instanceof File ? videoFile : new File([videoFile], "video.mp4");

		// Use WebAV for processing
		const result = await processVideoWithWebAV(file);

		return {
			keyFrames: result.frames,
			scenes: result.scenes,
			audioAnalysis: {
				hasAudio: true, // WebAV will determine this
				peaks: [],
			},
		};
	} catch (error) {
		console.error("Error analyzing video content:", error);
		throw error;
	}
}

// Preprocess video to calculate dynamic threshold (from original video2ppt)
export async function preprocessVideo(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<number> {
	const context = canvas.getContext("2d");
	if (!context) throw new Error("Cannot get canvas context");

	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;

	const totalDuration = video.duration;
	if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
		throw new Error("Video duration is unavailable");
	}
	const sampleCount = Math.min(60, Math.max(20, Math.ceil(totalDuration / 2)));
	const preProcessInterval = totalDuration / sampleCount;

	let currentTime = 0;
	let previousImageData: ImageData | null = null;
	const differences: number[] = [];

	const capturePreProcessFrame = async (time: number): Promise<void> => {
		await seekVideo(video, time);
		context.drawImage(video, 0, 0, canvas.width, canvas.height);
		const currentImageData = context.getImageData(0, 0, canvas.width, canvas.height);

		if (previousImageData) {
			const difference = calculateImageDifference(previousImageData, currentImageData);
			differences.push(difference);
		}

		previousImageData = currentImageData;
	};

	// Sample frames for threshold calculation
	while (currentTime <= totalDuration && differences.length < sampleCount) {
		await capturePreProcessFrame(currentTime);
		currentTime += preProcessInterval;
	}

	if (differences.length === 0) return 3;

	// Estimate the codec/noise floor from quieter samples. A low upper bound is
	// important for detecting animations that affect only part of a slide.
	const sortedDifferences = [...differences].sort((a, b) => a - b);
	const quietDifference = sortedDifferences[Math.floor(sortedDifferences.length * 0.25)];
	const finalThreshold = Math.max(2, Math.min(quietDifference * 2 + 1, 8));

	return finalThreshold;
}
