import saveAs from "file-saver";

import { generateTimestamp } from "./utils";

const SLIDE_WIDTH = 10;

/**
 * Convert a screenshot URL (normally a browser object URL) to a pre-encoded
 * data URI. PptxGenJS can embed this directly, avoiding browser XHR failures
 * with object URLs during export and preserving the original PNG bytes.
 */
interface PreparedImage {
	data: string;
	width: number;
	height: number;
}

async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
	if (typeof createImageBitmap === "function") {
		const bitmap = await createImageBitmap(blob);
		const dimensions = { width: bitmap.width, height: bitmap.height };
		bitmap.close();
		return dimensions;
	}

	const url = URL.createObjectURL(blob);
	try {
		return await new Promise((resolve, reject) => {
			const image = new Image();
			image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
			image.onerror = () => reject(new Error("Unable to read screenshot dimensions"));
			image.src = url;
		});
	} finally {
		URL.revokeObjectURL(url);
	}
}

async function prepareImage(imageUrl: string): Promise<PreparedImage> {
	const response = await fetch(imageUrl);
	if (!response.ok) {
		throw new Error(`Unable to read screenshot (${response.status})`);
	}

	const blob = await response.blob();
	const dimensions = await getImageDimensions(blob);
	const data = await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			if (typeof reader.result === "string") {
				resolve(reader.result);
			} else {
				reject(new Error("Unable to encode screenshot"));
			}
		};
		reader.onerror = () => reject(reader.error ?? new Error("Unable to read screenshot"));
		reader.readAsDataURL(blob);
	});
	return { data, ...dimensions };
}

function containImage(
	image: { width: number; height: number },
	box: { x: number; y: number; width: number; height: number }
): { x: number; y: number; w: number; h: number } {
	if (image.width <= 0 || image.height <= 0) {
		throw new Error("Screenshot has invalid dimensions");
	}

	const scale = Math.min(box.width / image.width, box.height / image.height);
	const width = image.width * scale;
	const height = image.height * scale;
	return {
		x: box.x + (box.width - width) / 2,
		y: box.y + (box.height - height) / 2,
		w: width,
		h: height,
	};
}

function configureNativeImageLayout(
	pptx: { defineLayout: (layout: { name: string; width: number; height: number }) => void; layout: string },
	image: { width: number; height: number }
): { width: number; height: number } {
	if (image.width <= 0 || image.height <= 0) {
		throw new Error("Screenshot has invalid dimensions");
	}

	const height = SLIDE_WIDTH * (image.height / image.width);
	pptx.defineLayout({ name: "VIDEO_NATIVE", width: SLIDE_WIDTH, height });
	pptx.layout = "VIDEO_NATIVE";
	return { width: SLIDE_WIDTH, height };
}

async function downloadPresentation(
	pptx: { write: (options: { outputType: "blob"; compression: boolean }) => Promise<unknown> },
	fileName: string
): Promise<void> {
	// PNG data is already compressed. STORE avoids an expensive second DEFLATE
	// pass and substantially reduces peak memory use for many 4K screenshots.
	const content = await pptx.write({ outputType: "blob", compression: false });
	const blob =
		content instanceof Blob
			? content
			: new Blob([content as BlobPart], {
					type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
				});
	saveAs(blob, fileName);
}

interface PPTSlideData {
	image: string;
	title?: string;
	description?: string;
}

export async function createAndDownloadPPT(
	screenshots: string[],
	options: {
		title?: string;
		maxSlides?: number;
		sortByImportance?: boolean;
	} = {}
): Promise<void> {
	try {
		// Dynamic import to avoid SSR issues
		const PptxGenJS = (await import("pptxgenjs")).default;

		if (screenshots.length === 0) {
			throw new Error("No screenshots available to create PPT");
		}

		const maxSlides = options.maxSlides || 256;
		const slidesToProcess = screenshots.slice(0, maxSlides);
		const firstScreenshot = await prepareImage(slidesToProcess[0]);
		const pptx = new PptxGenJS();
		const slideSize = configureNativeImageLayout(pptx, firstScreenshot);

		// Set presentation properties
		pptx.author = "Video2PPT";
		pptx.company = "Video2PPT";
		pptx.title = options.title || "Video Analysis Presentation";

		// Add title slide
		const titleSlide = pptx.addSlide();
		titleSlide.addText(options.title || "Video Analysis", {
			x: 1,
			y: 1,
			w: 8,
			h: 1,
			fontSize: 32,
			fontFace: "Arial",
			color: "363636",
			align: "center",
			bold: true,
		});

		titleSlide.addText(`Generated on ${new Date().toLocaleDateString()}`, {
			x: 1,
			y: slideSize.height - 0.8,
			w: slideSize.width - 2,
			h: 0.5,
			fontSize: 16,
			fontFace: "Arial",
			color: "666666",
			align: "center",
		});

		// Add screenshot slides
		for (let i = 0; i < slidesToProcess.length; i++) {
			const slide = pptx.addSlide();
			const screenshotUrl = slidesToProcess[i];

			try {
				const screenshot = i === 0 ? firstScreenshot : await prepareImage(screenshotUrl);
				const imagePosition = containImage(screenshot, {
					x: 0,
					y: 0,
					width: slideSize.width,
					height: slideSize.height,
				});

				// Add the screenshot image
				slide.addImage({
					data: screenshot.data,
					...imagePosition,
				});

				// Add slide number
				slide.addText(`${i + 1} / ${slidesToProcess.length}`, {
					x: slideSize.width - 1.2,
					y: slideSize.height - 0.35,
					w: 1,
					h: 0.3,
					fontSize: 10,
					fontFace: "Arial",
					color: "999999",
					align: "right",
				});
			} catch (error) {
				console.error(`Error adding slide ${i + 1}:`, error);
				// Add error slide instead
				slide.addText(`Error loading slide ${i + 1}`, {
					x: 1,
					y: 3,
					w: 8,
					h: 1,
					fontSize: 24,
					fontFace: "Arial",
					color: "FF0000",
					align: "center",
				});
			}
		}

		// Generate filename with timestamp
		const timestamp = generateTimestamp();
		const fileName = `Video2PPT_${timestamp}.pptx`;

		// Download the file. This is lossless ZIP packaging; the PNG image bytes
		// embedded above are not re-encoded or reduced in quality.
		await downloadPresentation(pptx, fileName);

		console.log(`PPT generated successfully: ${fileName}`);
	} catch (error) {
		console.error("Error creating PPT:", error);
		throw error;
	}
}

export async function createPPTFromVideoAnalysis(
	analysisResult: {
		keyFrames: string[];
		scenes: Array<{
			startTime: number;
			endTime: number;
			thumbnail: string;
		}>;
	},
	options: {
		title?: string;
		includeSceneBreaks?: boolean;
	} = {}
): Promise<void> {
	try {
		const PptxGenJS = (await import("pptxgenjs")).default;
		const firstImageUrl =
			options.includeSceneBreaks && analysisResult.scenes.length > 0
				? analysisResult.scenes[0].thumbnail
				: analysisResult.keyFrames[0];
		if (!firstImageUrl) {
			throw new Error("No screenshots available to create PPT");
		}
		const firstImage = await prepareImage(firstImageUrl);
		const pptx = new PptxGenJS();
		const slideSize = configureNativeImageLayout(pptx, firstImage);

		// Set presentation properties
		pptx.author = "Video2PPT";
		pptx.company = "Video2PPT";
		pptx.title = options.title || "Smart Video Analysis";

		// Add title slide
		const titleSlide = pptx.addSlide();
		titleSlide.addText(options.title || "Smart Video Analysis", {
			x: 1,
			y: 1,
			w: 8,
			h: 1,
			fontSize: 32,
			fontFace: "Arial",
			color: "363636",
			align: "center",
			bold: true,
		});

		titleSlide.addText("Generated using WebAV + FFmpeg Technology", {
			x: 1,
			y: 2.5,
			w: 8,
			h: 0.5,
			fontSize: 16,
			fontFace: "Arial",
			color: "666666",
			align: "center",
		});

		// Add scene-based slides
		if (options.includeSceneBreaks && analysisResult.scenes.length > 0) {
			for (let i = 0; i < analysisResult.scenes.length; i++) {
				const scene = analysisResult.scenes[i];
				const slide = pptx.addSlide();
				const thumbnail = i === 0 ? firstImage : await prepareImage(scene.thumbnail);
				const imagePosition = containImage(thumbnail, {
					x: 0,
					y: 0,
					width: slideSize.width,
					height: Math.max(0.5, slideSize.height - 0.9),
				});

				// Add scene thumbnail
				slide.addImage({
					data: thumbnail.data,
					...imagePosition,
				});

				// Add scene information
				const duration = scene.endTime - scene.startTime;
				slide.addText(`Scene ${i + 1}`, {
					x: 0.5,
					y: slideSize.height - 0.75,
					w: slideSize.width * 0.4,
					h: 0.5,
					fontSize: 18,
					fontFace: "Arial",
					color: "363636",
					bold: true,
				});

				slide.addText(`Duration: ${duration.toFixed(1)}s`, {
					x: slideSize.width * 0.5,
					y: slideSize.height - 0.75,
					w: slideSize.width * 0.4,
					h: 0.5,
					fontSize: 14,
					fontFace: "Arial",
					color: "666666",
				});
			}
		} else {
			// Add key frames
			for (let i = 0; i < analysisResult.keyFrames.length; i++) {
				const slide = pptx.addSlide();
				const keyFrame = i === 0 ? firstImage : await prepareImage(analysisResult.keyFrames[i]);
				const imagePosition = containImage(keyFrame, {
					x: 0,
					y: 0,
					width: slideSize.width,
					height: slideSize.height,
				});

				slide.addImage({
					data: keyFrame.data,
					...imagePosition,
				});

				// Add slide number
				slide.addText(`Key Frame ${i + 1}`, {
					x: 0.5,
					y: slideSize.height - 0.35,
					w: slideSize.width - 1,
					h: 0.25,
					fontSize: 12,
					fontFace: "Arial",
					color: "999999",
					align: "center",
				});
			}
		}

		// Generate filename
		const timestamp = generateTimestamp();
		const fileName = `SmartVideo2PPT_${timestamp}.pptx`;

		await downloadPresentation(pptx, fileName);
		console.log(`Smart PPT generated successfully: ${fileName}`);
	} catch (error) {
		console.error("Error creating smart PPT:", error);
		throw error;
	}
}

export function convertScreenshotsToSlideData(screenshots: string[]): PPTSlideData[] {
	return screenshots.map((screenshot, index) => ({
		image: screenshot,
		title: `Slide ${index + 1}`,
		description: `Screenshot captured at frame ${index + 1}`,
	}));
}
