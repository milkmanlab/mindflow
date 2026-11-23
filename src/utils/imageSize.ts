/** 取り込む画像の長辺の上限（px）。キャンバスを 400% まで拡大しても、高解像度の画面でぼやけにくい大きさ（縮小は元に戻せないため、先に余裕を持たせる） */
export const MAX_IMAGE_EDGE = 2048;

/** この大きさ（バイト）以下で、長辺も上限以内の画像は、再圧縮せずにそのまま使う（画質を落とさないため） */
export const KEEP_ORIGINAL_BYTES = 150 * 1024;

/** 再圧縮の品質（JPEG / WebP） */
export const IMAGE_QUALITY = 0.85;

export interface ImageSize {
  width: number;
  height: number;
}

/** 縦横の比を保ったまま、長辺が maxEdge に収まる大きさにする。小さい画像は拡大しない */
export function fitWithin(size: ImageSize, maxEdge: number = MAX_IMAGE_EDGE): ImageSize {
  const longEdge = Math.max(size.width, size.height);
  if (longEdge <= maxEdge) return { width: size.width, height: size.height };
  const scale = maxEdge / longEdge;
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

/** 再圧縮せずに、元のファイルをそのまま使うか */
export function shouldKeepOriginal(file: { type: string; size: number }, size: ImageSize): boolean {
  // SVG はベクター画像で、縮小しても意味がない
  if (file.type === 'image/svg+xml') return true;
  const fitted = fitWithin(size);
  const isWithinEdge = fitted.width === size.width && fitted.height === size.height;
  return isWithinEdge && file.size <= KEEP_ORIGINAL_BYTES;
}

/** 再圧縮の出力形式。JPEG は JPEG のまま、透過のある PNG などは WebP にする */
export function pickOutputType(fileType: string): 'image/jpeg' | 'image/webp' {
  return fileType === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
}
