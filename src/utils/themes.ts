import { ThemeConfig } from '../types';

export const THEMES: Record<string, ThemeConfig> = {
  natural: {
    id: 'natural',
    nameKey: 'theme.natural',
    bgClass: 'bg-[#f4f4f6]',
    isDark: false,
    canvasGridClass: 'bg-grid-pattern',
    accent: '#0f172a',
    onAccent: '#ffffff',
    done: '#3b7a57',
    root: {
      bg: '#334155',
      text: '#ffffff',
      border: '#1e293b',
    },
    node: {
      bg: '#ffffff',
      text: '#1e293b',
      border: '#d5dde7',
    },
    ui: {
      surface: '#ffffff',
      surfaceSunken: '#fafaf9',
      surfaceMuted: '#f5f5f4',
      surfaceStrong: '#e7e5e4',
      lineSubtle: '#f5f5f4',
      line: '#e7e5e4',
      lineStrong: '#d6d3d1',
      inkMuted: '#6f6964',
      ink: '#44403c',
      inkStrong: '#1c1917',
    },
    lineColor: '#64748b',
    branchColors: [
      '#3b7a57', // Sage / Forest Green
      '#c26d38', // Warm Ochre / Clay
      '#476a8a', // Slate Indigo
      '#ba5458', // Dusty Cedar / Terracotta
      '#36827f', // Muted Teal
      '#6b705c', // Olive Moss
      '#8f5c78', // Dusty Fig
      '#997b66', // Warm Sandstone
    ],
  },
  oceanic: {
    id: 'oceanic',
    nameKey: 'theme.oceanic',
    bgClass: 'bg-slate-50',
    isDark: false,
    canvasGridClass: 'bg-grid-pattern',
    accent: '#0f172a',
    onAccent: '#ffffff',
    done: '#059669',
    root: {
      bg: '#2563eb',
      text: '#ffffff',
      border: '#1d4ed8',
    },
    node: {
      bg: '#ffffff',
      text: '#1e293b',
      border: '#e2e8f0',
    },
    ui: {
      surface: '#ffffff',
      surfaceSunken: '#f8fafc',
      surfaceMuted: '#f1f5f9',
      surfaceStrong: '#e2e8f0',
      lineSubtle: '#f1f5f9',
      line: '#e2e8f0',
      lineStrong: '#cbd5e1',
      inkMuted: '#5d6d84',
      ink: '#334155',
      inkStrong: '#0f172a',
    },
    lineColor: '#64748b',
    branchColors: [
      '#2563eb', // Blue
      '#059669', // Emerald
      '#d97706', // Amber
      '#7c3aed', // Violet
      '#db2777', // Pink
      '#0891b2', // Cyan
      '#ea580c', // Orange
      '#4f46e5', // Indigo
    ],
  },
  darkAurora: {
    id: 'darkAurora',
    nameKey: 'theme.darkAurora',
    bgClass: 'bg-slate-950',
    isDark: true,
    canvasGridClass: 'bg-grid-pattern-dark',
    accent: '#ffffff',
    onAccent: '#0f172a',
    done: '#34d399',
    root: {
      bg: '#cbd5e1',
      text: '#0f172a',
      border: '#94a3b8',
    },
    node: {
      bg: '#0f172a',
      text: '#f1f5f9',
      border: '#1e293b',
    },
    ui: {
      surface: '#0f172a',
      surfaceSunken: '#020617',
      surfaceMuted: '#1e293b',
      surfaceStrong: '#334155',
      lineSubtle: '#1e293b',
      line: '#334155',
      lineStrong: '#475569',
      inkMuted: '#94a3b8',
      ink: '#e2e8f0',
      inkStrong: '#f1f5f9',
    },
    lineColor: '#64748b',
    branchColors: [
      '#38bdf8', // Sky
      '#34d399', // Emerald
      '#a78bfa', // Purple
      '#fb923c', // Orange
      '#f472b6', // Pink
      '#fbbf24', // Amber
      '#f87171', // Red
      '#2dd4bf', // Teal
    ],
  },
  minimal: {
    id: 'minimal',
    nameKey: 'theme.minimal',
    bgClass: 'bg-neutral-50',
    isDark: false,
    canvasGridClass: 'bg-grid-pattern',
    accent: '#171717',
    onAccent: '#ffffff',
    done: '#404040',
    root: {
      bg: '#171717',
      text: '#ffffff',
      border: '#0a0a0a',
    },
    node: {
      bg: '#ffffff',
      text: '#171717',
      border: '#d4d4d4',
    },
    ui: {
      surface: '#ffffff',
      surfaceSunken: '#fafafa',
      surfaceMuted: '#f5f5f5',
      surfaceStrong: '#e5e5e5',
      lineSubtle: '#f5f5f5',
      line: '#e5e5e5',
      lineStrong: '#d4d4d4',
      inkMuted: '#6b6b6b',
      ink: '#404040',
      inkStrong: '#171717',
    },
    lineColor: '#737373',
    branchColors: [
      '#262626',
      '#525252',
      '#404040',
      '#171717',
      '#737373',
      '#636363',
      '#333333',
      '#6b6b6b',
    ],
  },
};

export const DEFAULT_THEME_ID = 'natural';

/** なくしたテーマの ID → 読み替え先（古い Markdown を開いたときのため） */
const THEME_ALIASES: Record<string, string> = {
  naturalSage: 'natural',
  emerald: 'natural',
  sunset: 'oceanic',
  lavender: 'oceanic',
  immersive: 'darkAurora',
};

/** 表示に使うテーマの ID。なくしたテーマは読み替え、知らない ID は既定のテーマにする */
export function resolveThemeId(themeId: string | undefined): string {
  if (!themeId) return DEFAULT_THEME_ID;
  if (Object.hasOwn(THEMES, themeId)) return themeId;
  return Object.hasOwn(THEME_ALIASES, themeId) ? THEME_ALIASES[themeId] : DEFAULT_THEME_ID;
}

/** 表示に使うテーマ */
export function getTheme(themeId: string | undefined): ThemeConfig {
  return THEMES[resolveThemeId(themeId)];
}

/** テーマの色を、#mindflow-app-root に渡す CSS 変数にする（index.css の @theme inline と :root の名前に対応） */
export function themeCssVariables(theme: ThemeConfig): Record<`--mf-${string}`, string> {
  const { ui } = theme;
  return {
    '--mf-accent': theme.accent,
    '--mf-on-accent': theme.onAccent,
    '--mf-done': theme.done,
    '--mf-root': theme.root.bg,
    '--mf-on-root': theme.root.text,
    '--mf-root-line': theme.root.border,
    '--mf-node': theme.node.bg,
    '--mf-on-node': theme.node.text,
    '--mf-node-line': theme.node.border,
    '--mf-surface': ui.surface,
    '--mf-surface-sunken': ui.surfaceSunken,
    '--mf-surface-muted': ui.surfaceMuted,
    '--mf-surface-strong': ui.surfaceStrong,
    '--mf-line-subtle': ui.lineSubtle,
    '--mf-line': ui.line,
    '--mf-line-strong': ui.lineStrong,
    '--mf-ink-muted': ui.inkMuted,
    '--mf-ink': ui.ink,
    '--mf-ink-strong': ui.inkStrong,
  };
}
