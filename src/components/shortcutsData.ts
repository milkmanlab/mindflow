import type { MessageKey } from '../i18n';

/** ショートカット一覧の 1 行 */
export interface ShortcutEntry {
  /** 操作の説明（辞書のキー） */
  descKey: MessageKey;
  /**
   * 別の組み合わせ（どれを使ってもよい）。1 つの組み合わせは、順に押すキーの並びで、要素 1 つが kbd 1 つになる。
   * 「↑ / ↓」のように、同じ位置のどちらかを押すものは、1 つの要素に書く。
   * キーの名前でなく言葉で書くもの（「ダブルクリック」など）は、辞書のキー（shortcuts.key.*）を書く
   */
  combos: string[][];
}

export interface ShortcutSection {
  titleKey: MessageKey;
  entries: ShortcutEntry[];
}

export const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    titleKey: 'shortcuts.section.edit',
    entries: [
      { descKey: 'shortcuts.edit.addChild', combos: [['Tab']] },
      { descKey: 'shortcuts.edit.addSiblingBelow', combos: [['Enter']] },
      { descKey: 'shortcuts.edit.addSiblingAbove', combos: [['Shift', 'Enter']] },
      { descKey: 'shortcuts.edit.typeToEdit', combos: [['shortcuts.key.typing']] },
      { descKey: 'shortcuts.edit.keepAndEdit', combos: [['Space'], ['F2'], ['shortcuts.key.doubleClick']] },
      { descKey: 'shortcuts.edit.newline', combos: [['Alt', 'Enter'], ['Ctrl/Cmd', 'Enter']] },
      { descKey: 'shortcuts.edit.commit', combos: [['Esc']] },
      { descKey: 'shortcuts.edit.delete', combos: [['Delete / Backspace']] },
    ],
  },
  {
    titleKey: 'shortcuts.section.move',
    entries: [
      { descKey: 'shortcuts.move.reorder', combos: [['Alt', '↑ / ↓'], ['Ctrl/Cmd', 'Shift', '↑ / ↓']] },
      { descKey: 'shortcuts.move.drop', combos: [['shortcuts.key.dragDrop']] },
      { descKey: 'shortcuts.move.reorderOnly', combos: [['Alt', 'shortcuts.key.dragDrop']] },
    ],
  },
  {
    titleKey: 'shortcuts.section.select',
    entries: [
      { descKey: 'shortcuts.select.upDown', combos: [['↑ / ↓']] },
      { descKey: 'shortcuts.select.parentChild', combos: [['← / →']] },
      { descKey: 'shortcuts.select.fold', combos: [['\\'], ['Alt', '/'], ['Ctrl/Cmd', '.']] },
      { descKey: 'shortcuts.select.root', combos: [['Home']] },
      { descKey: 'shortcuts.select.lastChild', combos: [['End']] },
    ],
  },
  {
    titleKey: 'shortcuts.section.view',
    entries: [
      { descKey: 'shortcuts.view.panSetting', combos: [['shortcuts.key.rightDrag']] },
      { descKey: 'shortcuts.view.pan', combos: [['shortcuts.key.middleClick'], ['shortcuts.key.backgroundDrag']] },
      { descKey: 'shortcuts.view.zoom', combos: [['shortcuts.key.wheel'], ['shortcuts.key.pinch']] },
      { descKey: 'shortcuts.view.fit', combos: [['F'], ['Ctrl/Cmd', '0']] },
      { descKey: 'shortcuts.view.reset', combos: [['R'], ['Ctrl/Cmd', '1']] },
      { descKey: 'shortcuts.view.copy', combos: [['Ctrl/Cmd', 'C']] },
      { descKey: 'shortcuts.view.paste', combos: [['Ctrl/Cmd', 'V']] },
      { descKey: 'shortcuts.view.undo', combos: [['Ctrl/Cmd', 'Z']] },
      { descKey: 'shortcuts.view.redo', combos: [['Ctrl/Cmd', 'Shift', 'Z'], ['Ctrl/Cmd', 'Y']] },
      { descKey: 'shortcuts.view.search', combos: [['Ctrl/Cmd', 'F']] },
      { descKey: 'shortcuts.view.help', combos: [['?']] },
    ],
  },
];
