import { describe, expect, it } from 'vitest';
import { formatElapsedTime, getElapsedSeconds } from './relativeTime';

describe('getElapsedSeconds', () => {
  it('経過したミリ秒を、秒に切り捨てること', () => {
    expect(getElapsedSeconds(1000, 1000)).toBe(0);
    expect(getElapsedSeconds(1000, 1999)).toBe(0);
    expect(getElapsedSeconds(1000, 2000)).toBe(1);
    expect(getElapsedSeconds(1000, 61_500)).toBe(60);
  });

  it('保存時刻が未来のときは 0 になること', () => {
    expect(getElapsedSeconds(5000, 1000)).toBe(0);
  });
});

describe('formatElapsedTime', () => {
  it('5 秒未満は「たった今」になること', () => {
    expect(formatElapsedTime(0)).toBe('たった今');
    expect(formatElapsedTime(4)).toBe('たった今');
  });

  it('5 秒以上 60 秒未満は「◯秒前」になること', () => {
    expect(formatElapsedTime(5)).toBe('5秒前');
    expect(formatElapsedTime(59)).toBe('59秒前');
  });

  it('60 秒以上 60 分未満は「◯分前」になること（秒は切り捨て）', () => {
    expect(formatElapsedTime(60)).toBe('1分前');
    expect(formatElapsedTime(119)).toBe('1分前');
    expect(formatElapsedTime(59 * 60 + 59)).toBe('59分前');
  });

  it('60 分以上は「◯時間前」になること（分は切り捨て。日には繰り上げない）', () => {
    expect(formatElapsedTime(60 * 60)).toBe('1時間前');
    expect(formatElapsedTime(2 * 60 * 60 - 1)).toBe('1時間前');
    expect(formatElapsedTime(49 * 60 * 60)).toBe('49時間前');
  });
});
