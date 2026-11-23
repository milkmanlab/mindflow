import { describe, it, expect } from 'vitest';
import { DocumentSyncState } from './documentSyncState';

describe('DocumentSyncState', () => {
  it('Webview の書き込みによる変更通知は送らない', () => {
    const s = new DocumentSyncState('a');
    expect(s.beginWebviewEdit('b', 'a')).toBe(true);
    expect(s.onDocumentChanged('b')).toBeNull();
    s.endWebviewEdit('b');
    expect(s.lastKnownText).toBe('b');
  });

  it('外部の変更は送る', () => {
    const s = new DocumentSyncState('a');
    expect(s.onDocumentChanged('x')).toBe('x');
    expect(s.lastKnownText).toBe('x');
  });

  it('書き込み中に起きた、書き込んだ内容と異なる変更は送る', () => {
    const s = new DocumentSyncState('a');
    s.beginWebviewEdit('b', 'a');
    expect(s.onDocumentChanged('formatted-b')).toBe('formatted-b');
  });

  it('連続した edit（A → B）で、A の通知が送り返されない', () => {
    const s = new DocumentSyncState('0');
    s.beginWebviewEdit('A', '0');
    s.endWebviewEdit('A');
    s.beginWebviewEdit('B', 'A');
    expect(s.onDocumentChanged('A')).toBeNull();
    expect(s.onDocumentChanged('B')).toBeNull();
    s.endWebviewEdit('B');
  });

  it('内容が変わらない通知（保存など）は送らない', () => {
    const s = new DocumentSyncState('a');
    expect(s.onDocumentChanged('a')).toBeNull();
  });

  it('現在の内容と同じ edit は書き込み不要と判定する', () => {
    const s = new DocumentSyncState('a');
    expect(s.beginWebviewEdit('c', 'c')).toBe(false);
    expect(s.lastKnownText).toBe('c');
  });
});
