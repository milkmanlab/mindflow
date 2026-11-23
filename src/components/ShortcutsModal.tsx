import { isMessageKey, t } from '../i18n';
import React, { useEffect, useRef } from 'react';
import { MENU_SCOPE_PROPS } from '../hooks/canvasKeyboardHandlers';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { CloseButton } from './PropertiesBarParts';
import { SHORTCUT_SECTIONS, ShortcutEntry } from './shortcutsData';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KBD_CLASS =
  'px-2 py-1 rounded-control bg-surface border border-line text-ink font-mono text-ui-caption';

/** 1 つの組み合わせ。キーを 1 つずつ kbd に分け、「+」でつなぐ */
const KeyCombo: React.FC<{ keys: string[] }> = ({ keys }) => (
  <span className="inline-flex items-center gap-1">
    {keys.map((key, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span className="text-ui-caption text-ink-muted">+</span>}
        <kbd className={KBD_CLASS}>{isMessageKey(key) ? t(key) : key}</kbd>
      </React.Fragment>
    ))}
  </span>
);

const ShortcutRow: React.FC<{ entry: ShortcutEntry }> = ({ entry }) => (
  <div className="flex items-center justify-between px-3.5 py-2.5 text-ui-body gap-3">
    <span className="text-ink">{t(entry.descKey)}</span>
    <span className="flex items-center justify-end flex-wrap gap-x-1.5 gap-y-1 shrink-0 max-w-[55%]">
      {entry.combos.map((combo, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-ui-caption text-ink-muted">{t('shortcuts.or')}</span>}
          <KeyCombo keys={combo} />
        </React.Fragment>
      ))}
    </span>
  </div>
);

/** ショートカット一覧。Esc・背景のクリック・閉じるボタンで閉じる。開いている間は、フォーカスを中に閉じ込める */
export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, dialogRef);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="shortcuts-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      // 中でマウスを押して外で離したときに閉じないよう、背景そのものを押したときだけ閉じる
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        {...MENU_SCOPE_PROPS}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        className="bg-surface rounded-panel shadow-float border border-line w-full max-w-3xl overflow-hidden flex flex-col max-h-[88vh]"
      >
        <div className="px-6 py-4 border-b border-line-subtle flex items-center justify-between">
          <h3 id="shortcuts-modal-title" className="text-ui-heading text-ink-strong">
            {t('shortcuts.title')}
          </h3>
          <CloseButton id="btn-close-shortcuts" title={t('common.closeWithKey')} onClick={onClose} />
        </div>

        <div className="p-6 overflow-y-auto md:columns-2 md:gap-6">
          {SHORTCUT_SECTIONS.map((sec) => (
            <section key={sec.titleKey} className="break-inside-avoid space-y-2 mb-5">
              <h4 className="text-ui-body text-ink-muted">{t(sec.titleKey)}</h4>
              <div className="rounded-panel border border-line-subtle divide-y divide-line-subtle overflow-hidden bg-surface-sunken/50">
                {sec.entries.map((entry) => (
                  <ShortcutRow key={entry.descKey} entry={entry} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
