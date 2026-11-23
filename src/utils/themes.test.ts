import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { t } from '../i18n';
import { DEFAULT_THEME_ID, THEMES, getTheme, resolveThemeId, themeCssVariables } from './themes';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('THEMES のアクセント色', () => {
  const themes = Object.values(THEMES);

  it('すべてのテーマに 16 進の accent と onAccent があること', () => {
    for (const t of themes) {
      expect(t.accent, t.id).toMatch(/^#[0-9a-f]{6}$/);
      expect(t.onAccent, t.id).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('accent が UI の面に対して 4.5:1 以上のコントラストを持つこと', () => {
    for (const t of themes) {
      for (const surface of [t.ui.surface, t.ui.surfaceMuted]) {
        expect(contrast(t.accent, surface), `${t.id} / ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('onAccent が accent に対して 4.5:1 以上のコントラストを持つこと', () => {
    for (const t of themes) {
      expect(contrast(t.onAccent, t.accent), t.id).toBeGreaterThanOrEqual(4.5);
    }
  });
});

function rgbDistance(a: string, b: string): number {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return Math.hypot(ch(a, 0) - ch(b, 0), ch(a, 1) - ch(b, 1), ch(a, 2) - ch(b, 2));
}

describe('THEMES の色の役割', () => {
  const themes = Object.values(THEMES);
  // モノクロは灰色だけのテーマなので、accent を枝色と区別できる色にはしない
  const colorful = themes.filter((t) => t.id !== 'minimal');

  it('accent が、すべての枝色・ルートの面と離れていること（選択の枠が埋もれない）', () => {
    for (const t of colorful) {
      for (const color of [...t.branchColors, t.root.bg]) {
        expect(rgbDistance(t.accent, color), `${t.id} / ${color}`).toBeGreaterThanOrEqual(60);
      }
    }
  });

  it('done が 16 進で、ノードの面に対して 3:1 以上のコントラストを持つこと', () => {
    for (const t of themes) {
      expect(t.done, t.id).toMatch(/^#[0-9a-f]{6}$/);
      expect(contrast(t.done, t.node.bg), t.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('ルートの文字が、ルートの面に対して 4.5:1 以上のコントラストを持つこと', () => {
    for (const t of themes) {
      expect(contrast(t.root.text, t.root.bg), t.id).toBeGreaterThanOrEqual(4.5);
    }
  });
});

// bgClass（Tailwind）に対応するキャンバスの背景色
const CANVAS_BACKGROUNDS: Record<string, string> = {
  natural: '#f4f4f6',
  oceanic: '#f8fafc',
  minimal: '#fafafa',
  darkAurora: '#020617',
};

describe('THEMES の構成', () => {
  const themes = Object.values(THEMES);

  it('テーマが 4 つで、ID が決まったものであること', () => {
    expect(Object.keys(THEMES).sort()).toEqual(['darkAurora', 'minimal', 'natural', 'oceanic']);
    for (const [key, t] of Object.entries(THEMES)) expect(t.id).toBe(key);
  });

  it('名前に括弧や英字が入っていないこと', () => {
    for (const theme of themes) expect(t(theme.nameKey), theme.id).not.toMatch(/[()（）A-Za-z]/);
  });

  it('既定のテーマが存在すること', () => {
    expect(THEMES[DEFAULT_THEME_ID]).toBeDefined();
  });
});

describe('THEMES のルートノードの色', () => {
  const themes = Object.values(THEMES);

  it('塗り・文字・枠がすべて 16 進の色であること（グラデーションを使わない）', () => {
    for (const t of themes) {
      expect(t.root.bg, t.id).toMatch(/^#[0-9a-f]{6}$/);
      expect(t.root.text, t.id).toMatch(/^#[0-9a-f]{6}$/);
      expect(t.root.border, t.id).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('文字が塗りに対して 4.5:1 以上のコントラストを持つこと', () => {
    for (const t of themes) expect(contrast(t.root.text, t.root.bg), t.id).toBeGreaterThanOrEqual(4.5);
  });

  it('塗りがキャンバスの背景から見分けられること（3:1 以上）', () => {
    for (const t of themes) expect(contrast(t.root.bg, CANVAS_BACKGROUNDS[t.id]), t.id).toBeGreaterThanOrEqual(3);
  });
});

describe('THEMES のブランチの色', () => {
  it('8 色あること', () => {
    for (const t of Object.values(THEMES)) expect(t.branchColors, t.id).toHaveLength(8);
  });

  it('キャンバスの背景に対して 3:1 以上のコントラストを持つこと', () => {
    for (const t of Object.values(THEMES)) {
      for (const color of t.branchColors) {
        expect(contrast(color, CANVAS_BACKGROUNDS[t.id]), `${t.id} / ${color}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('同じ色が重ならないこと', () => {
    for (const t of Object.values(THEMES)) expect(new Set(t.branchColors).size, t.id).toBe(t.branchColors.length);
  });
});

describe('THEMES の接続線の既定色', () => {
  it('キャンバスの背景に対して 3:1 以上のコントラストを持つこと', () => {
    for (const t of Object.values(THEMES)) {
      expect(contrast(t.lineColor, CANVAS_BACKGROUNDS[t.id]), t.id).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('resolveThemeId / getTheme', () => {
  it('残したテーマの ID はそのまま返すこと', () => {
    for (const id of Object.keys(THEMES)) expect(resolveThemeId(id)).toBe(id);
  });

  it('なくしたテーマの ID は、近いテーマに読み替えること', () => {
    expect(resolveThemeId('naturalSage')).toBe('natural');
    expect(resolveThemeId('emerald')).toBe('natural');
    expect(resolveThemeId('sunset')).toBe('oceanic');
    expect(resolveThemeId('lavender')).toBe('oceanic');
    expect(resolveThemeId('immersive')).toBe('darkAurora');
  });

  it('知らない ID と未指定は、既定のテーマにすること', () => {
    expect(resolveThemeId('ocean')).toBe(DEFAULT_THEME_ID);
    expect(resolveThemeId('')).toBe(DEFAULT_THEME_ID);
    expect(resolveThemeId(undefined)).toBe(DEFAULT_THEME_ID);
    expect(resolveThemeId('toString')).toBe(DEFAULT_THEME_ID);
  });

  it('getTheme が読み替え後のテーマを返すこと', () => {
    expect(getTheme('immersive')).toBe(THEMES.darkAurora);
    expect(getTheme('unknown')).toBe(THEMES[DEFAULT_THEME_ID]);
  });
});

describe('THEMES の UI の灰色', () => {
  const themes = Object.values(THEMES);
  const KEYS = ['surface', 'surfaceSunken', 'surfaceMuted', 'surfaceStrong', 'lineSubtle', 'line', 'lineStrong', 'inkMuted', 'ink', 'inkStrong'] as const;

  it('すべてのテーマが ui の 10 項目を 16 進の色で持つこと', () => {
    for (const t of themes) {
      expect(Object.keys(t.ui).sort(), t.id).toEqual([...KEYS].sort());
      for (const key of KEYS) expect(t.ui[key], `${t.id} / ${key}`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('補助文字が面・沈んだ面・hover の面の上で 4.5:1 以上あること', () => {
    for (const t of themes) {
      for (const bg of [t.ui.surface, t.ui.surfaceSunken, t.ui.surfaceMuted]) {
        expect(contrast(t.ui.inkMuted, bg), `${t.id} / ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('本文と見出しが面・沈んだ面・hover の面の上で 7:1 以上あること', () => {
    for (const t of themes) {
      for (const bg of [t.ui.surface, t.ui.surfaceSunken, t.ui.surfaceMuted]) {
        expect(contrast(t.ui.ink, bg), `${t.id} ink / ${bg}`).toBeGreaterThanOrEqual(7);
        expect(contrast(t.ui.inkStrong, bg), `${t.id} inkStrong / ${bg}`).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it('themeCssVariables が index.css の :root にある --mf-* をすべて返すこと', () => {
    const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf-8');
    const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
    const declared = [...root.matchAll(/(--mf-[a-z-]+):/g)].map((m) => m[1]).sort();
    for (const t of themes) {
      expect(Object.keys(themeCssVariables(t)).sort(), t.id).toEqual(declared);
    }
  });
});
