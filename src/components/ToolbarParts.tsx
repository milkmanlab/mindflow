import React from 'react';
import { Check } from 'lucide-react';

// ツールバーと設定メニューで繰り返し使う見た目の部品。
// クラス文字列は Tailwind が拾えるよう、すべて完全な形で書く

/** 設定メニューの小さな見出し */
export const SettingsSectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-ui-caption text-ink-muted px-1 mb-1 block">{children}</span>
);

/** 設定メニューの段の見出し（段の名前と、保存先の補足） */
export const SettingsGroupHeader: React.FC<{ title: string; note: string }> = ({ title, note }) => (
  <div className="px-1 pb-1.5 border-b border-line-subtle">
    <span className="block text-ui-heading text-ink">{title}</span>
    <span className="block text-ui-caption text-ink-muted mt-0.5">{note}</span>
  </div>
);

/**
 * 「1 つを選ぶ」行（レイアウト・接続線・テーマ・フォント・入力モード）。
 * 選択中は背景が付き、右端にチェックが出る
 */
export const SettingsOptionRow: React.FC<{
  selected: boolean;
  onClick: () => void;
  label: string;
  /** ラベルの下に出す補足。見本を別の書体で出すときは descriptionStyle を渡す */
  description?: string;
  descriptionStyle?: React.CSSProperties;
  /** ラベルの左に置くもの（アイコンなど） */
  leading?: React.ReactNode;
  /** チェックの左に置くもの（枝の色の点など） */
  trailing?: React.ReactNode;
}> = ({ selected, onClick, label, description, descriptionStyle, leading, trailing }) => (
  <button
    onClick={onClick}
    aria-pressed={selected}
    className={`w-full px-2.5 py-1.5 rounded-control text-left flex items-center gap-2 transition-colors ${
      selected
        ? 'bg-surface-muted text-ink-strong'
        : 'text-ink hover:bg-surface-muted'
    }`}
  >
    {leading}
    <span className="flex-1 min-w-0">
      <span className="block text-ui-body truncate">{label}</span>
      {description && (
        <span
          style={descriptionStyle}
          className="block text-ui-caption text-ink-muted mt-0.5 leading-snug"
        >
          {description}
        </span>
      )}
    </span>
    {trailing}
    {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
  </button>
);

/**
 * 「オン・オフ」の行（右ドラッグで画面を移動）。右端のスイッチで状態を表す。
 * 設定では「選択中」に色を使わない決まりなので、スイッチもスレートの濃淡だけで表す
 */
export const SettingsSwitchRow: React.FC<{
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description: string;
}> = ({ checked, onChange, label, description }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="w-full px-2.5 py-2 rounded-control text-left flex items-center gap-3 text-ink hover:bg-surface-muted transition-colors"
  >
    <span className="flex-1 min-w-0">
      <span className="block text-ui-body">{label}</span>
      <span className="block text-ui-caption text-ink-muted mt-0.5 leading-snug">{description}</span>
    </span>
    <span
      className={`w-7 h-4 rounded-full shrink-0 flex items-center px-0.5 transition-colors ${
        checked ? 'bg-ink justify-end' : 'bg-line-strong justify-start'
      }`}
    >
      <span className="w-3 h-3 rounded-full bg-surface" />
    </span>
  </button>
);
