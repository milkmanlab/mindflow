import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as LucideIcons from 'lucide-react';
import { AVAILABLE_ICONS } from '../components/IconRenderer';
import {
  CHECK_ICON,
  EXPORT_ICONS,
  FALLBACK_ICON,
  LINK_ICON,
  NOTE_ICON,
  getExportIcon,
  renderIconSvg,
  type IconNodeEntry,
} from './exportIcons';

/** lucide-react のコンポーネントを描いた結果から、中の要素（タグと属性）を取り出す */
function childrenOf(Component: React.ElementType): IconNodeEntry[] {
  const html = renderToStaticMarkup(React.createElement(Component));
  const inner = html.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return [...inner.matchAll(/<(\w+)((?:\s[\w-]+="[^"]*")*)\s*(?:\/>|><\/\1>)/g)].map((m) => {
    const attrs: Record<string, string> = {};
    for (const a of m[2].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    return [m[1], attrs];
  });
}

const normalize = (icon: IconNodeEntry[]) =>
  icon.map(([tag, attrs]) => [
    tag,
    Object.fromEntries(Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => [k, String(v)])),
  ]);

const reactIcon = (name: string) => (LucideIcons as unknown as Record<string, React.ElementType>)[name];

describe('書き出し用のアイコン', () => {
  it('ノードに付けられるアイコンがすべて、書き出し側にもあること', () => {
    expect(Object.keys(EXPORT_ICONS).sort()).toEqual(AVAILABLE_ICONS.map((i) => i.name).sort());
  });

  it.each(AVAILABLE_ICONS.map((i) => i.name))('%s の形が、画面（lucide-react）と同じになること', (name) => {
    expect(normalize(EXPORT_ICONS[name])).toEqual(normalize(childrenOf(reactIcon(name))));
  });

  it('Tag・チェック印・メモ・リンクの形が、画面と同じになること', () => {
    expect(normalize(FALLBACK_ICON)).toEqual(normalize(childrenOf(LucideIcons.Tag)));
    expect(normalize(CHECK_ICON)).toEqual(normalize(childrenOf(LucideIcons.CheckCircle2)));
    expect(normalize(NOTE_ICON)).toEqual(normalize(childrenOf(LucideIcons.FileText)));
    expect(normalize(LINK_ICON)).toEqual(normalize(childrenOf(LucideIcons.ExternalLink)));
  });

  it('一覧にない名前は Tag になること', () => {
    expect(getExportIcon('NoSuchIcon')).toBe(FALLBACK_ICON);
    expect(getExportIcon('Star')).toBe(EXPORT_ICONS.Star);
  });

  it('位置・大きさ・色を指定した SVG の要素になること', () => {
    const svg = renderIconSvg(EXPORT_ICONS.Star, 10, 20, 16, '#ff0000');
    expect(svg).toContain('translate(10 20) scale(0.6666666666666666)');
    expect(svg).toContain('stroke="#ff0000"');
    expect(svg).toContain('<path d="M11.525');
    expect(svg).not.toContain('key=');
  });

  it('アイコンの中の currentColor は、指定した色になること（img で読む SVG では currentColor が黒になるため）', () => {
    const svg = renderIconSvg(FALLBACK_ICON, 0, 0, 24, '#123456');
    expect(svg).toContain('fill="#123456"');
    expect(svg).not.toContain('currentColor');
  });

  it('色の文字列が属性を抜けられないようにエスケープされること', () => {
    expect(renderIconSvg(EXPORT_ICONS.Star, 0, 0, 24, '"><script>')).not.toContain('<script>');
  });

  it('値が undefined の属性は書き出さないこと（lucide 1.x の属性は undefined を取りうるため）', () => {
    const svg = renderIconSvg([['path', { d: 'M0 0', fill: undefined }]], 0, 0, 24, '#000');
    expect(svg).toContain('<path d="M0 0" />');
    expect(svg).not.toContain('undefined');
  });
});
