import React from 'react';

/**
 * ボタンの大きさは 2 系統。
 * md（32px・アイコン 16px）は浮くバー用、sm（28px・アイコン 14px）はプロパティバーやパネルの中用。
 * クラス文字列は Tailwind が拾えるよう、完全な形で書く
 */
export const ICON_BUTTON_SIZE = {
  md: 'w-8 h-8',
  sm: 'w-7 h-7',
} as const;

export type IconButtonSize = keyof typeof ICON_BUTTON_SIZE;

/** 開いている・選択中のときの面（色は使わない） */
export const ICON_BUTTON_ACTIVE_CLASS = 'bg-surface-strong text-ink-strong';
export const ICON_BUTTON_IDLE_CLASS =
  'text-ink hover:bg-surface-muted';

/** アイコンだけのボタン。active のあいだは灰色の面が付く */
export const IconButton: React.FC<{
  id?: string;
  size?: IconButtonSize;
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ id, size = 'md', active = false, onClick, title, children }) => (
  <button
    id={id}
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`${ICON_BUTTON_SIZE[size]} flex items-center justify-center rounded-control transition-colors shrink-0 ${
      active ? ICON_BUTTON_ACTIVE_CLASS : ICON_BUTTON_IDLE_CLASS
    }`}
  >
    {children}
  </button>
);
