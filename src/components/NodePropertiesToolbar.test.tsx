import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MindNode } from '../types';
import { NodePropertiesToolbar, hasTextStyle, isPanelAvailable } from './NodePropertiesToolbar';
import { NodeTextPanel } from './NodeTextPanel';

const makeNode = (overrides: Partial<MindNode> = {}): MindNode =>
  ({ id: 'n1', parentId: 'root', text: 'ノード', createdAt: 0, updatedAt: 0, ...overrides }) as MindNode;

describe('hasTextStyle', () => {
  it('既定のときは false、どれかを変えていれば true', () => {
    expect(hasTextStyle(makeNode(), false)).toBe(false);
    expect(hasTextStyle(makeNode({ fontSize: 'base' }), false)).toBe(false);
    expect(hasTextStyle(makeNode({ fontSize: 'lg' }), false)).toBe(true);
    expect(hasTextStyle(makeNode({ bold: true }), false)).toBe(true);
    expect(hasTextStyle(makeNode({ italic: true }), false)).toBe(true);
    expect(hasTextStyle(makeNode({ underline: true }), false)).toBe(true);
    expect(hasTextStyle(makeNode({ textColor: '#2563eb' }), false)).toBe(true);
  });

  it('ルートは太字が既定なので、太字だけでは true にならないこと', () => {
    expect(hasTextStyle(makeNode(), true)).toBe(false);
    expect(hasTextStyle(makeNode({ bold: false }), true)).toBe(true);
  });
});

const toolbarProps = {
  node: makeNode(),
  isRoot: false,
  selectedCount: 1,
  activePanel: null,
  onTogglePanel: vi.fn(),
  onUpdateProps: vi.fn(),
  onClose: vi.fn(),
};

const ids = (html: string) => [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);

describe('NodePropertiesToolbar の上段', () => {
  it('常に出す項目が、決めた順に並び、文字の装飾は上段に出さず、「その他」もないこと', () => {
    const found = ids(renderToStaticMarkup(<NodePropertiesToolbar {...toolbarProps} />));
    expect(found).toEqual([
      'prop-btn-text',
      'prop-btn-color',
      'prop-btn-icon',
      'prop-btn-shape',
      'prop-btn-progress',
      'prop-btn-note',
      'prop-btn-link',
      'prop-btn-image',
      'prop-btn-close',
    ]);
  });

  it('開いているパネルは背景、設定済みの項目は点で、別々に示すこと', () => {
    const html = (node: MindNode, activePanel: 'color' | null) =>
      renderToStaticMarkup(<NodePropertiesToolbar {...toolbarProps} node={node} activePanel={activePanel} />);
    const dots = (h: string) => (h.match(/w-1\.5 h-1\.5 rounded-full/g) || []).length;
    expect(dots(html(makeNode(), null))).toBe(0);
    expect(dots(html(makeNode({ color: '#2563eb', note: 'm', shape: 'pill' as MindNode['shape'] }), null))).toBe(3);
    // 開いているだけでは点は出ず、値があるだけでは背景が付かない
    expect(dots(html(makeNode(), 'color'))).toBe(0);
    expect(html(makeNode(), 'color')).toContain('bg-surface-strong text-ink-strong');
    expect(html(makeNode({ color: '#2563eb' }), null)).not.toContain('bg-surface-strong text-ink-strong');
  });
});

describe('1 ノード選択と複数選択', () => {
  const render = (props: Partial<React.ComponentProps<typeof NodePropertiesToolbar>> & { selectedCount: number }) =>
    renderToStaticMarkup(<NodePropertiesToolbar {...toolbarProps} {...props} />);

  it('1 ノード選択のときは、ノード名を出さないこと', () => {
    const html = render({ selectedCount: 1, node: makeNode({ text: 'ひみつの名前' }) });
    expect(html).not.toContain('ひみつの名前');
    expect(html).not.toContain('multi-selection-badge');
  });

  it('複数選択のときは、件数と削除を出し、メモ・リンク・画像のボタンを出さないこと', () => {
    const found = ids(render({ selectedCount: 3, onDeleteSelected: vi.fn() }));
    expect(found).toEqual([
      'multi-selection-badge',
      'prop-btn-delete-selected',
      'prop-btn-text',
      'prop-btn-color',
      'prop-btn-icon',
      'prop-btn-shape',
      'prop-btn-progress',
      'prop-btn-close',
    ]);
  });
});

describe('isPanelAvailable', () => {
  it('1 ノード選択ではすべて使え、複数選択ではメモ・リンク・画像が使えないこと', () => {
    for (const panel of ['text', 'color', 'icon', 'shape', 'progress', 'note', 'link', 'image'] as const) {
      expect(isPanelAvailable(panel, 1)).toBe(true);
    }
    for (const panel of ['text', 'color', 'icon', 'shape', 'progress'] as const) {
      expect(isPanelAvailable(panel, 2)).toBe(true);
    }
    for (const panel of ['note', 'link', 'image'] as const) {
      expect(isPanelAvailable(panel, 2)).toBe(false);
    }
  });
});

describe('パネルの中身', () => {
  it('「文字」のパネルに、文字サイズ・太字・斜体・下線がある', () => {
    const found = ids(renderToStaticMarkup(<NodeTextPanel node={makeNode()} isRoot={false} onUpdateProps={vi.fn()} />));
    expect(found).toEqual(['prop-font-size-group', 'prop-font-style-group', 'prop-btn-bold', 'prop-btn-italic', 'prop-btn-underline']);
  });
});
