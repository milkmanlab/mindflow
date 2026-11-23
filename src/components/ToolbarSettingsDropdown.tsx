import { t } from '../i18n';
import React from 'react';
import { MindMap, LayoutType, ConnectorStyle, EditInputMode } from '../types';
import { SlidersHorizontal } from 'lucide-react';
import { MENU_SCOPE_PROPS } from '../hooks/canvasKeyboardHandlers';
import { CloseButton } from './PropertiesBarParts';
import { ControlsSettingsPanel, MapSettingsSection } from './ToolbarSettingsPanels';

interface ToolbarSettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  mindMap: MindMap;
  editInputMode: EditInputMode;
  enableRightClickPan: boolean;
  onChangeLayout: (layoutType: LayoutType) => void;
  onChangeConnector: (style: ConnectorStyle) => void;
  onChangeTheme: (themeId: string) => void;
  onChangeFontFamily?: (fontFamily: string) => void;
  onChangeInputMode: (mode: EditInputMode) => void;
  onChangeRightClickPan: (enabled: boolean) => void;
}

/**
 * ツールバーから開く設定メニュー。
 * 「このマップ」（Markdown に保存される）と「操作」（保存されない）の 2 段を、1 枚に並べる
 */
export const ToolbarSettingsDropdown: React.FC<ToolbarSettingsDropdownProps> = ({
  isOpen,
  onClose,
  mindMap,
  editInputMode,
  enableRightClickPan,
  onChangeLayout,
  onChangeConnector,
  onChangeTheme,
  onChangeFontFamily,
  onChangeInputMode,
  onChangeRightClickPan,
}) => {
  if (!isOpen) return null;

  return (
    <div
      {...MENU_SCOPE_PROPS}
      className="absolute right-0 top-full mt-2 w-[350px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-13rem)] overflow-y-auto bg-surface rounded-panel shadow-float border border-line p-3 z-50"
    >
      {/* 見出しと閉じるボタン */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-line-subtle">
        <span className="text-ui-heading text-ink flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-ink-muted" />
          <span>{t('settings.title')}</span>
        </span>
        <CloseButton id="btn-close-settings" title={t('common.closeWithKey')} onClick={onClose} />
      </div>

      <div className="space-y-5">
        <MapSettingsSection
          layoutType={mindMap.layoutType}
          connectorStyle={mindMap.connectorStyle}
          themeId={mindMap.themeId}
          fontFamily={mindMap.fontFamily}
          onChangeLayout={onChangeLayout}
          onChangeConnector={onChangeConnector}
          onChangeTheme={onChangeTheme}
          onChangeFontFamily={onChangeFontFamily}
        />
        <ControlsSettingsPanel
          editInputMode={editInputMode}
          enableRightClickPan={enableRightClickPan}
          onChangeInputMode={onChangeInputMode}
          onChangeRightClickPan={onChangeRightClickPan}
        />
      </div>
    </div>
  );
};
