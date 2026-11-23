import { t } from '../i18n';
import React, { useCallback, useRef, useState } from 'react';
import { Download, FileImage } from 'lucide-react';
import { MENU_SCOPE_PROPS } from '../hooks/canvasKeyboardHandlers';
import { useMenuDismiss } from '../hooks/useMenuDismiss';
import { IconButton } from './IconButton';

interface ToolbarExportMenuProps {
  onExportPNG: () => void;
  onExportSVG: () => void;
}

const EXPORT_ITEM_CLASS =
  'w-full px-2.5 py-1.5 rounded-control text-ui-body text-ink hover:bg-surface-muted flex items-center gap-2 text-left transition-colors';

/** ツールバーの画像保存ボタンと、形式を選ぶメニュー */
export const ToolbarExportMenu: React.FC<ToolbarExportMenuProps> = ({ onExportPNG, onExportSVG }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setIsOpen(false), []);
  useMenuDismiss(isOpen, containerRef, close);

  /** メニューを閉じてから保存を始める */
  const exportWith = (run: () => void) => () => {
    close();
    run();
  };

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <IconButton
        id="btn-export-menu"
        active={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        title={t('export.menu')}
      >
        <Download className="w-4 h-4 shrink-0" />
      </IconButton>

      {isOpen && (
        <div
          {...MENU_SCOPE_PROPS}
          className="absolute right-0 top-full mt-2 w-52 bg-surface rounded-panel shadow-float border border-line p-2 z-50">
          <span className="text-ui-caption text-ink-muted px-2 py-1 block">
            {t('export.menu')}
          </span>
          <div className="space-y-1">
            <button onClick={exportWith(onExportPNG)} className={EXPORT_ITEM_CLASS}>
              <FileImage className="w-4 h-4 text-ink-muted shrink-0" />
              <span>{t('export.png')}</span>
            </button>
            <button onClick={exportWith(onExportSVG)} className={EXPORT_ITEM_CLASS}>
              <FileImage className="w-4 h-4 text-ink-muted shrink-0" />
              <span>{t('export.svg')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
