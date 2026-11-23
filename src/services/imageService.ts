import { IMAGE_QUALITY, ImageSize, fitWithin, pickOutputType, shouldKeepOriginal } from '../utils/imageSize';

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** 取り込んだ画像。size は、取り込んだ後の画像の大きさ（読み込めない形式のときはなし） */
export interface ImportedImage {
  dataUrl: string;
  size?: ImageSize;
}

/**
 * 画像ファイルを、Markdown に保存する Data URL にする。
 * 長辺が上限（MAX_IMAGE_EDGE）を超える、または大きいファイルは、縮小して再圧縮する。
 * 読み込めない形式のときは、元のファイルをそのまま Data URL にする（取り込めなくなることは避ける）
 */
export async function readImageFile(file: File): Promise<ImportedImage> {
  const original = await readAsDataUrl(file);
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const source = { width: bitmap.width, height: bitmap.height };
      if (shouldKeepOriginal(file, source)) return { dataUrl: original, size: source };

      const target = fitWithin(source);
      const canvas = document.createElement('canvas');
      canvas.width = target.width;
      canvas.height = target.height;
      const context = canvas.getContext('2d');
      if (!context) return { dataUrl: original, size: source };
      context.drawImage(bitmap, 0, 0, target.width, target.height);

      const resized = canvas.toDataURL(pickOutputType(file.type), IMAGE_QUALITY);
      const isDownscaled = target.width !== source.width || target.height !== source.height;
      // 縮小していないのに、再圧縮のほうが重くなったときは、元のまま使う
      return isDownscaled || resized.length < original.length
        ? { dataUrl: resized, size: target }
        : { dataUrl: original, size: source };
    } finally {
      bitmap.close();
    }
  } catch {
    return { dataUrl: original };
  }
}

/** 画像の URL を読み込んで、大きさを測る。読み込めないとき（URL の誤り、通信の失敗など）は undefined */
export function measureImage(url: string): Promise<ImageSize | undefined> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(undefined);
    image.src = url;
  });
}
