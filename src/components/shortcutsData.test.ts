import { describe, it, expect } from 'vitest';
import { SHORTCUT_SECTIONS } from './shortcutsData';
import { isMessageKey, t } from '../i18n';

describe('SHORTCUT_SECTIONS', () => {
  const entries = SHORTCUT_SECTIONS.flatMap((s) => s.entries);

  it('すべての行に説明と、1 つ以上の組み合わせがあること', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(t(e.descKey), t(e.descKey)).not.toBe('');
      expect(e.combos.length, t(e.descKey)).toBeGreaterThan(0);
    }
  });

  it('組み合わせの各キーが空でなく、1 つの kbd に複数の組み合わせを詰めていないこと', () => {
    for (const e of entries) {
      for (const combo of e.combos) {
        expect(combo.length, t(e.descKey)).toBeGreaterThan(0);
        for (const key of combo) {
          expect(key.trim(), t(e.descKey)).not.toBe('');
          // 「Alt + Enter」のように、複数のキーを 1 つの箱に入れない（「↑ / ↓」のような選択肢は許す）
          expect(key, `${t(e.descKey)} / ${key}`).not.toMatch(/ \+ /);
          expect(key, `${t(e.descKey)} / ${key}`).not.toMatch(/\/ (Ctrl|Alt|Shift|Cmd)/);
        }
      }
    }
  });

  it('修飾キーは Ctrl/Cmd と書き、Cmd だけの表記がないこと', () => {
    for (const e of entries) {
      for (const key of e.combos.flat()) expect(key, t(e.descKey)).not.toMatch(/^(Cmd|Ctrl)$/);
    }
  });

  it('同じ組み合わせが、別の行に重複していないこと', () => {
    const seen = new Map<string, string>();
    for (const e of entries) {
      for (const combo of e.combos) {
        const id = combo.join('+');
        // 同じ説明の中の重複は許さない。別の説明に同じキーがあれば、重複
        expect(seen.get(id), `${id} (${t(e.descKey)})`).toBeUndefined();
        seen.set(id, t(e.descKey));
      }
    }
  });

  it('キーの名前でなく言葉で書いた組み合わせは、辞書のキー（shortcuts.key.*）であること', () => {
    for (const e of entries) {
      for (const key of e.combos.flat()) {
        if (/^shortcuts\./.test(key)) expect(isMessageKey(key), key).toBe(true);
        // 日本語のキー名の直書きは、辞書に移す（noHardcodedJapanese も検出する）
        expect(key, t(e.descKey)).not.toMatch(/[ぁ-んァ-ヶ一-龥]/);
      }
    }
  });
});
