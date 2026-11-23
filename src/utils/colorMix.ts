/** 16 進の色（#rrggbb）を、a を ratio の割合で b に混ぜた色にする。画面の color-mix(in srgb, …) と同じ計算 */
export function mixHex(a: string, b: string, ratio: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return (
    '#' +
    [0, 1, 2]
      .map((i) => Math.round(channel(a, i) * ratio + channel(b, i) * (1 - ratio)))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}
