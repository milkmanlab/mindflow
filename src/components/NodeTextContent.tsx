import { t } from '../i18n';
import React from 'react';
import { ThemeConfig } from '../types';

interface NodeTextContentProps {
  isEditing: boolean;
  isRoot: boolean;
  /** 表示用のテキスト（ノードの文字列） */
  text: string;
  /** 編集中の文字列 */
  editText: string;
  textareaRef: React.Ref<HTMLTextAreaElement>;
  textareaHandlers: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  theme: ThemeConfig;
  fontSizeClass: string;
  decorationClass: string;
  lineHeight: number;
  textColor?: string;
  /** 文字色を指定していないときの、テーマの文字色のクラス */
  themeTextClass: string;
}

/**
 * ノードのテキスト。編集中は textarea、それ以外は表示用の div。
 * mind-node-textarea クラスは、App の Undo/Redo 処理がノードの編集欄を見分けるのに使う
 */
export const NodeTextContent: React.FC<NodeTextContentProps> = ({
  isEditing,
  isRoot,
  text,
  editText,
  textareaRef,
  textareaHandlers,
  theme,
  fontSizeClass,
  decorationClass,
  lineHeight,
  textColor,
  themeTextClass,
}) => (
  <div className="flex-1 min-w-0">
    {isEditing ? (
      <textarea
        ref={textareaRef}
        value={editText}
        {...textareaHandlers}
        rows={1}
        placeholder={isRoot ? t('content.rootDefault') : ''}
        className={`mind-node-textarea w-full block bg-transparent resize-none outline-none border-none p-0 m-0 overflow-hidden whitespace-pre ${
          isRoot
            ? 'text-white text-center placeholder:text-white/50'
            : theme.isDark
            ? 'text-slate-100 placeholder:text-slate-500'
            : 'text-slate-900 placeholder:text-slate-400'
        } ${fontSizeClass} ${decorationClass}`}
        style={{
          color: textColor || undefined,
          height: `${lineHeight * Math.max(1, (editText || '').split('\n').length)}px`,
          minHeight: `${lineHeight}px`,
          lineHeight: `${lineHeight}px`,
        }}
      />
    ) : (
      <div
        data-node-text
        className={`whitespace-pre ${isRoot ? 'text-center' : ''} ${fontSizeClass} ${decorationClass} ${
          textColor ? '' : themeTextClass
        }`}
        style={{
          color: textColor || undefined,
          minHeight: `${lineHeight}px`,
          lineHeight: `${lineHeight}px`,
        }}
      >
        {text || <span className="opacity-40 italic text-xs select-none">{isRoot ? t('content.rootDefault') : ''}</span>}
      </div>
    )}
  </div>
);
