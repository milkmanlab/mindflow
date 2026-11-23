import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Tag } from 'lucide-react';
import { AVAILABLE_ICONS, IconRenderer } from './IconRenderer';

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

describe('AVAILABLE_ICONS', () => {
  it('名前に重複がないこと', () => {
    const names = AVAILABLE_ICONS.map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('IconRenderer', () => {
  it.each(AVAILABLE_ICONS.map((i) => [i.name, i.Icon] as const))('%s を名前で描くと、その部品を直接描いた結果と同じになること', (name, Icon) => {
    expect(render(<IconRenderer name={name} />)).toBe(render(<Icon className="w-4 h-4" />));
  });

  it('名前がなければ何も描かないこと', () => {
    expect(render(<IconRenderer />)).toBe('');
    expect(render(<IconRenderer name="" />)).toBe('');
  });

  it('一覧にない名前は Tag で描くこと（lucide にある名前でも同じ）', () => {
    const tag = render(<Tag className="w-4 h-4" />);
    expect(render(<IconRenderer name="NoSuchIcon" />)).toBe(tag);
    expect(render(<IconRenderer name="Check" />)).toBe(tag);
  });

  it('オブジェクトの標準のプロパティ名でも、Tag で描くこと', () => {
    const tag = render(<Tag className="w-4 h-4" />);
    expect(render(<IconRenderer name="constructor" />)).toBe(tag);
    expect(render(<IconRenderer name="toString" />)).toBe(tag);
  });

  it('className と size が渡ること', () => {
    expect(render(<IconRenderer name="Star" className="w-3 h-3" size={12} />)).toContain('width="12"');
    expect(render(<IconRenderer name="Star" className="w-3 h-3" />)).toContain('w-3 h-3');
  });
});
