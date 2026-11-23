/** KeyboardEvent のうち、判定に使うプロパティだけ（DOM に依存しないため） */
export interface KeyLike {
  key: string;
  code: string;
  keyCode: number;
  isComposing: boolean;
}

/** 押しても編集を始めないキー（F1〜F24 は FUNCTION_KEY_PATTERN で判定する） */
const NON_EDITING_KEYS = [
  'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Insert', 'PageUp', 'PageDown',
  'NumLock', 'ScrollLock', 'Pause', 'ContextMenu', 'Fn', 'FnLock',
];
/** ファンクションキー。'F' で始まるかだけで判定すると、大文字の F まで対象外になる */
const FUNCTION_KEY_PATTERN = /^F\d{1,2}$/;

// IME の切り替えキー（半角/全角、英数、かな、変換など）は、IME にそのまま届ける必要がある
const IME_TOGGLE_CODES = [
  'Backquote', 'Lang1', 'Lang2', 'Lang3', 'Lang4', 'Lang5',
  'Convert', 'NonConvert', 'KanaMode', 'Eisu',
];
const IME_TOGGLE_KEYS = [
  'Zenkaku', 'Hankaku', 'ZenkakuHankaku', 'KanjiMode', 'Eisu', 'KanaMode',
  'Alphanumeric', 'HiraganaKatakana', 'Hiragana', 'Katakana', 'Convert',
  'NonConvert', 'Romaji', 'HangulMode', 'HanjaMode',
];
// 古い keyCode：21/22/25（Hangul/Kana/Kanji）、28/29（Convert/NonConvert）、
// 240〜244（Eisu/Kana/Zenkaku-Hankaku）。Chrome は文字のような key で報告することがある
const IME_TOGGLE_KEY_CODES = [21, 22, 25, 28, 29, 240, 241, 242, 243, 244];

/** IME が処理中のキー（変換中、'Process'、keyCode 229） */
export function isImeProcessKey(e: KeyLike): boolean {
  return e.isComposing || e.key === 'Process' || e.keyCode === 229;
}

/** IME の切り替えキー */
export function isImeToggleKey(e: KeyLike): boolean {
  return (
    IME_TOGGLE_KEYS.includes(e.key) ||
    IME_TOGGLE_KEY_CODES.includes(e.keyCode) ||
    // Backquote などは通常の文字キーでもあるため、IME 処理中か文字でない key のときだけ切り替えキーとみなす
    (IME_TOGGLE_CODES.includes(e.code) && (isImeProcessKey(e) || e.key.length !== 1))
  );
}

/** 押しても編集を始めないキー（修飾キー、F1〜F12 など） */
export function isNonEditingKey(key: string): boolean {
  return NON_EDITING_KEYS.includes(key) || FUNCTION_KEY_PATTERN.test(key);
}
