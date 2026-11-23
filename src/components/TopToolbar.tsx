import { t } from '../i18n';
import React, { useCallback, useRef, useState } from 'react';
import { MindMap, LayoutType, ConnectorStyle, EditInputMode, SaveStatus } from '../types';
import { useMenuDismiss } from '../hooks/useMenuDismiss';
import { SaveStatusBadge } from './SaveStatusBadge';
import { ToolbarExportMenu } from './ToolbarExportMenu';
import { FloatingBar } from './FloatingBar';
import { IconButton } from './IconButton';
import { ToolbarSettingsDropdown } from './ToolbarSettingsDropdown';
import { Search, SlidersHorizontal } from 'lucide-react';

interface TopToolbarProps {
  mindMap: MindMap;
  editInputMode: EditInputMode;
  enableRightClickPan: boolean;
  saveStatus?: SaveStatus;
  lastSavedAt?: number | null;
  onChangeTheme: (themeId: string) => void;
  onChangeFontFamily?: (fontFamily: string) => void;
  onChangeLayout: (layoutType: LayoutType) => void;
  onChangeConnector: (style: ConnectorStyle) => void;
  onChangeInputMode: (mode: EditInputMode) => void;
  onChangeRightClickPan: (enabled: boolean) => void;
  onOpenSearch: () => void;
  isSearchOpen?: boolean;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onManualSave?: () => void;
}

/** 右上に浮くツールバー。保存状態と、検索・設定・画像保存を置く（ファイル名は VS Code のタブにあるので出さない） */
export const TopToolbar: React.FC<TopToolbarProps> = ({
  mindMap,
  editInputMode,
  enableRightClickPan,
  saveStatus = 'saved',
  lastSavedAt,
  onChangeTheme,
  onChangeFontFamily,
  onChangeLayout,
  onChangeConnector,
  onChangeInputMode,
  onChangeRightClickPan,
  onOpenSearch,
  isSearchOpen = false,
  onExportPNG,
  onExportSVG,
  onManualSave,
}) => {
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const closeSettingsMenu = useCallback(() => setIsSettingsMenuOpen(false), []);
  useMenuDismiss(isSettingsMenuOpen, settingsMenuRef, closeSettingsMenu);

  return (
    // 設定メニューの位置は、この塊（fixed）を基準にする。狭い画面ではみ出さないため
    <FloatingBar id="top-toolbar" className="fixed top-6 right-6 z-30">
      <SaveStatusBadge saveStatus={saveStatus} lastSavedAt={lastSavedAt} onManualSave={onManualSave} />

      <IconButton id="btn-search" active={isSearchOpen} onClick={onOpenSearch} title={t('toolbar.search')}>
        <Search className="w-4 h-4" />
      </IconButton>

      <div className="shrink-0" ref={settingsMenuRef}>
        <IconButton
          id="btn-settings-picker"
          active={isSettingsMenuOpen}
          onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
          title={t('toolbar.settings')}
        >
          <SlidersHorizontal className="w-4 h-4 shrink-0" />
        </IconButton>

        {/* 閉じているあいだも描画しておく（最後に開いていたタブを覚えておくため） */}
        <ToolbarSettingsDropdown
          isOpen={isSettingsMenuOpen}
          onClose={closeSettingsMenu}
          mindMap={mindMap}
          editInputMode={editInputMode}
          enableRightClickPan={enableRightClickPan}
          onChangeLayout={onChangeLayout}
          onChangeConnector={onChangeConnector}
          onChangeTheme={onChangeTheme}
          onChangeFontFamily={onChangeFontFamily}
          onChangeInputMode={onChangeInputMode}
          onChangeRightClickPan={onChangeRightClickPan}
        />
      </div>

      <ToolbarExportMenu onExportPNG={onExportPNG} onExportSVG={onExportSVG} />
    </FloatingBar>
  );
};
