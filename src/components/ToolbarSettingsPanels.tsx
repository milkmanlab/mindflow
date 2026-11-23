import { t } from '../i18n';
import React from 'react';
import { ConnectorStyle, EditInputMode, LayoutType } from '../types';
import { buildFontFamilyCss, FONT_STYLES, resolveFontStyle } from '../utils/fontStyles';
import { THEMES, resolveThemeId } from '../utils/themes';
import { CONNECTOR_OPTIONS, LAYOUT_OPTIONS } from './toolbarSettingsOptions';
import { SettingsGroupHeader, SettingsOptionRow, SettingsSectionLabel, SettingsSwitchRow } from './ToolbarParts';
import { ConnectorPreview, ThemePreview } from './SettingsPreviews';

// 設定メニューの各項目の中身

/** レイアウトと接続線 */
export const LayoutSettingsPanel: React.FC<{
  layoutType: LayoutType;
  connectorStyle: ConnectorStyle;
  onChangeLayout: (layoutType: LayoutType) => void;
  onChangeConnector: (style: ConnectorStyle) => void;
}> = ({ layoutType, connectorStyle, onChangeLayout, onChangeConnector }) => (
  <div className="space-y-3">
    <div className="space-y-0.5">
      <SettingsSectionLabel>{t('settings.layout')}</SettingsSectionLabel>
      {LAYOUT_OPTIONS.map((item) => {
        const Icon = item.icon;
        return (
          <SettingsOptionRow
            key={item.id}
            selected={layoutType === item.id}
            onClick={() => onChangeLayout(item.id)}
            label={t(item.labelKey)}
            leading={<Icon className="w-3.5 h-3.5 shrink-0" />}
          />
        );
      })}
    </div>

    <div className="space-y-0.5">
      <SettingsSectionLabel>{t('settings.connector')}</SettingsSectionLabel>
      {CONNECTOR_OPTIONS.map((item) => (
        <SettingsOptionRow
          key={item.id}
          selected={connectorStyle === item.id}
          onClick={() => onChangeConnector(item.id)}
          label={t(item.labelKey)}
          leading={<ConnectorPreview style={item.id} />}
        />
      ))}
    </div>
  </div>
);

/** テーマ */
export const ThemeSettingsPanel: React.FC<{
  themeId: string;
  /** 見本の枝の形に使う */
  connectorStyle: ConnectorStyle;
  onChangeTheme: (themeId: string) => void;
}> = ({ themeId, connectorStyle, onChangeTheme }) => {
  const currentId = resolveThemeId(themeId);
  return (
    <div className="space-y-0.5">
      <SettingsSectionLabel>{t('settings.theme')}</SettingsSectionLabel>
      {Object.values(THEMES).map((theme) => (
        <SettingsOptionRow
          key={theme.id}
          selected={currentId === theme.id}
          onClick={() => onChangeTheme(theme.id)}
          label={t(theme.nameKey)}
          leading={<ThemePreview theme={theme} connectorStyle={connectorStyle} />}
        />
      ))}
    </div>
  );
};

/** マップ全体のフォント */
export const FontSettingsPanel: React.FC<{
  /** 未設定・なくした書体・知らない値のときは、ゴシック（sans）を選択中として扱う */
  fontFamily: string | undefined;
  onChangeFontFamily?: (fontFamily: string) => void;
}> = ({ fontFamily, onChangeFontFamily }) => {
  const selectedId = resolveFontStyle(fontFamily).id;
  return (
    <div className="space-y-0.5">
      <SettingsSectionLabel>{t('settings.font')}</SettingsSectionLabel>
      {FONT_STYLES.map((style) => (
        <SettingsOptionRow
          key={style.id}
          selected={selectedId === style.id}
          onClick={() => onChangeFontFamily?.(style.id)}
          label={t(style.nameKey)}
          description={t('settings.fontSample')}
          descriptionStyle={{ fontFamily: buildFontFamilyCss(style) }}
        />
      ))}
    </div>
  );
};

/** 利用者の設定：右ドラッグでのパンと、文字キーを打ったときの入力モード */
export const ControlsSettingsPanel: React.FC<{
  editInputMode: EditInputMode;
  enableRightClickPan: boolean;
  onChangeInputMode: (mode: EditInputMode) => void;
  onChangeRightClickPan: (enabled: boolean) => void;
}> = ({ editInputMode, enableRightClickPan, onChangeInputMode, onChangeRightClickPan }) => (
  <section className="space-y-3">
    <SettingsGroupHeader title={t('settings.controls')} note={t('settings.controlsNote')} />
    <div>
      <SettingsSectionLabel>{t('settings.canvas')}</SettingsSectionLabel>
      <SettingsSwitchRow
        checked={enableRightClickPan}
        onChange={onChangeRightClickPan}
        label={t('settings.rightDragPan')}
        description={t('settings.rightDragPanDesc')}
      />
    </div>

    <div className="space-y-0.5">
      <SettingsSectionLabel>{t('settings.inputMode')}</SettingsSectionLabel>
      <SettingsOptionRow
        selected={editInputMode === 'overwrite'}
        onClick={() => onChangeInputMode('overwrite')}
        label={t('settings.overwrite')}
        description={t('settings.overwriteDesc')}
      />
      <SettingsOptionRow
        selected={editInputMode === 'append'}
        onClick={() => onChangeInputMode('append')}
        label={t('settings.append')}
        description={t('settings.appendDesc')}
      />
    </div>
  </section>
);

/** 「このマップ」の段：Markdown のフロントマターに保存される設定 */
export const MapSettingsSection: React.FC<{
  layoutType: LayoutType;
  connectorStyle: ConnectorStyle;
  themeId: string;
  fontFamily: string | undefined;
  onChangeLayout: (layoutType: LayoutType) => void;
  onChangeConnector: (style: ConnectorStyle) => void;
  onChangeTheme: (themeId: string) => void;
  onChangeFontFamily?: (fontFamily: string) => void;
}> = ({ layoutType, connectorStyle, themeId, fontFamily, onChangeLayout, onChangeConnector, onChangeTheme, onChangeFontFamily }) => (
  <section className="space-y-3">
    <SettingsGroupHeader title={t('settings.mapGroup')} note={t('settings.mapGroupNote')} />
    <ThemeSettingsPanel themeId={themeId} connectorStyle={connectorStyle} onChangeTheme={onChangeTheme} />
    <FontSettingsPanel fontFamily={fontFamily} onChangeFontFamily={onChangeFontFamily} />
    <LayoutSettingsPanel
      layoutType={layoutType}
      connectorStyle={connectorStyle}
      onChangeLayout={onChangeLayout}
      onChangeConnector={onChangeConnector}
    />
  </section>
);
