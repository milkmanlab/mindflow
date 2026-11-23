import { MindNode } from '../types';
import { ImageSize } from './imageSize';

/** 画像の枠の大きさ。width が null のときは「ノードの中身の幅いっぱい」 */
export interface ImageBox {
  width: number | null;
  height: number;
}

/** 縦横比が分からない画像の枠の高さ。画像とテキストの間隔（IMAGE_TEXT_GAP）と合わせて、以前の見積もり（115）になる */
export const FALLBACK_IMAGE_HEIGHT = 109;
/** 画像とテキストの間隔（px） */
export const IMAGE_TEXT_GAP = 6;
/** 既定の大きさ（この枠に収まる最大の大きさ） */
const DEFAULT_BOX = { width: 240, height: 180 };
/** 幅の下限と、長辺の上限（px） */
export const MIN_IMAGE_WIDTH = 48;
export const MAX_IMAGE_EDGE_IN_NODE = 800;

type ImageBoxSource = Pick<MindNode, 'image' | 'imageWidth' | 'imageAspect'>;

/** 手で書き換えた値（数でない・0 以下・無限大）は、ないものとして扱う */
function positiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

/** 幅を、下限と上限の内側に収めて整数にする。下限を優先する（極端に細長い画像） */
function clampWidth(width: number, aspect: number): number {
  const maxWidth = Math.min(MAX_IMAGE_EDGE_IN_NODE, MAX_IMAGE_EDGE_IN_NODE * aspect);
  return Math.round(Math.max(MIN_IMAGE_WIDTH, Math.min(width, maxWidth)));
}

/**
 * ノードの画像の枠の大きさを決める。画面・レイアウトの見積もり・書き出しは、すべてこの関数を使う。
 * 画像がないときは null。縦横比が分からない画像は、決まった高さの枠に全体を出す
 */
export function resolveImageBox(node: ImageBoxSource): ImageBox | null {
  if (!node.image) return null;
  const aspect = positiveNumber(node.imageAspect);
  if (!aspect) return { width: null, height: FALLBACK_IMAGE_HEIGHT };

  const defaultWidth = Math.min(DEFAULT_BOX.width, DEFAULT_BOX.height * aspect);
  const width = clampWidth(positiveNumber(node.imageWidth) ?? defaultWidth, aspect);
  return { width, height: Math.max(1, Math.round(width / aspect)) };
}

/**
 * つまみのドラッグから、新しい幅を決める。
 * @param scale キャンバスの拡大率（画面上の動きをノードの座標に直す）
 * @param direction 右へ動かすと大きくなるなら 1、左へ動かすと大きくなるなら -1
 */
export function resizeImageWidth(
  startWidth: number,
  deltaX: number,
  scale: number,
  aspect: number,
  direction: 1 | -1 = 1
): number {
  const safeScale = scale > 0 ? scale : 1;
  return clampWidth(startWidth + (direction * deltaX) / safeScale, aspect);
}

/** 縦横比（幅 ÷ 高さ）を、保存する桁数（小数 4 桁）に丸める。大きさが不正なときは undefined */
export function roundAspect(size: ImageSize): number | undefined {
  if (!(size.width > 0) || !(size.height > 0)) return undefined;
  return Math.round((size.width / size.height) * 10000) / 10000;
}

/**
 * 画像を付ける・差し替える・消すときの部分更新。
 * 前の画像の幅は捨て、縦横比は分かるときだけ入れる（ばらばらに書くと古い幅が残るため、必ずこれを通す）
 */
export function imageProps(image: string | undefined, size?: ImageSize): Partial<MindNode> {
  return {
    image,
    imageWidth: undefined,
    imageAspect: image && size ? roundAspect(size) : undefined,
  };
}
