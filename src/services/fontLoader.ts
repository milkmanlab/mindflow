import { getAllFontFaces } from '../utils/fontFaces';
import { LATIN_UNICODE_RANGE } from '../utils/fontStyles';

/**
 * 同梱フォントを登録する（起動時に 1 回）。
 * ここでは登録するだけで、`load()` は呼ばない。ブラウザは、登録された FontFace を、その書体・太さ・斜体の文字を描くときに初めて読み込む。
 * なので、使わない書体（ゴシックのマップでの明朝体・等幅）や太さ・斜体は、デコードされない。
 * ノードの大きさは DOM を測らず見積もるので、読み込みの前後でレイアウトは変わらない。
 * display: 'block' で、代わりのフォントからの入れ替わり（ちらつき）を出さない（ローカルの data URI なので待ちはほぼない）
 */
export function registerBundledFonts(): void {
  // テスト（jsdom）など、FontFace のない環境では何もしない
  if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts) return;
  for (const face of getAllFontFaces()) {
    const fontFace = new FontFace(face.family, `url(${face.dataUri}) format("woff2")`, {
      unicodeRange: LATIN_UNICODE_RANGE,
      weight: String(face.weight),
      style: face.style,
      display: 'block',
    });
    document.fonts.add(fontFace);
  }
}
