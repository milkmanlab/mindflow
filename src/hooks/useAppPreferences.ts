import { t } from '../i18n';
import { useState, useCallback } from 'react';
import { EditInputMode } from '../types';

const INPUT_MODE_KEY = 'mindflow_input_mode_v1';
const RIGHT_CLICK_PAN_KEY = 'mindflow_right_click_pan_v1';

/** localStorage が使えない環境（設定で無効など）でも動くように、失敗は無視する */
function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSetting(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 保存できなくても、今の画面では設定が効いているので続ける
  }
}

/** 利用者の設定（文字入力のモード、右クリックでのパン）。localStorage に保存する */
export function useAppPreferences(showToast: (msg: string) => void) {
  // 'overwrite'（上書き）| 'append'（追記）
  const [editInputMode, setEditInputMode] = useState<EditInputMode>(() =>
    readSetting(INPUT_MODE_KEY) === 'append' ? 'append' : 'overwrite'
  );

  const [enableRightClickPan, setEnableRightClickPan] = useState<boolean>(() => {
    const saved = readSetting(RIGHT_CLICK_PAN_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  const handleChangeInputMode = useCallback(
    (mode: EditInputMode) => {
      setEditInputMode(mode);
      writeSetting(INPUT_MODE_KEY, mode);
      showToast(
        mode === 'overwrite'
          ? t('prefs.inputOverwrite')
          : t('prefs.inputAppend')
      );
    },
    [showToast]
  );

  const handleChangeRightClickPan = useCallback(
    (enabled: boolean) => {
      setEnableRightClickPan(enabled);
      writeSetting(RIGHT_CLICK_PAN_KEY, String(enabled));
      showToast(
        enabled
          ? t('prefs.panEnabled')
          : t('prefs.panDisabled')
      );
    },
    [showToast]
  );

  return { editInputMode, handleChangeInputMode, enableRightClickPan, handleChangeRightClickPan };
}
