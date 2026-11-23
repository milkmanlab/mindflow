import { describe, it, expect } from 'vitest';
import { hostMessage, HostMessageKey } from './messages';

const KEYS: HostMessageKey[] = ['warn.selectFile', 'error.openUrl', 'dialog.save', 'info.imageSaved', 'error.saveFailed',
  'error.fileExists', 'error.createFailed'];

describe('hostMessage', () => {
  it('両方の言語で、差し込みが置き換わること', () => {
    expect(hostMessage('ja', 'info.imageSaved', { name: 'a.png' })).toBe('画像を保存しました: a.png');
    expect(hostMessage('en', 'info.imageSaved', { name: 'a.png' })).toBe('Image saved: a.png');
  });

  it('英語に日本語の文字が混ざらず、差し込みが日本語と同じ集合であること', () => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const key of KEYS) {
      const en = hostMessage('en', key);
      expect(en, key).not.toMatch(/[ぁ-んァ-ヶ一-龥]/);
      expect(placeholders(en), key).toBe(placeholders(hostMessage('ja', key)));
    }
  });
});
