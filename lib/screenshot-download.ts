import saveAs from "file-saver";
import JSZip from "jszip";

export async function downloadScreenshotsAsZip(screenshots: string[], filePrefix: string): Promise<void> {
	if (screenshots.length === 0) {
		throw new Error("没有可下载的截图");
	}

	const zip = new JSZip();
	for (let index = 0; index < screenshots.length; index++) {
		const response = await fetch(screenshots[index]);
		if (!response.ok) {
			throw new Error(`读取第 ${index + 1} 张截图失败 (${response.status})`);
		}
		zip.file(`${filePrefix}_${String(index + 1).padStart(3, "0")}.png`, await response.blob());
	}

	// PNG files are already compressed, so STORE is faster and uses less memory.
	const archive = await zip.generateAsync({ type: "blob", compression: "STORE" });
	saveAs(archive, `${filePrefix}_all.zip`);
}
