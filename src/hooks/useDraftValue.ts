import { useState, useEffect } from 'react';

/**
 * 入力欄の下書き。value を初期値とし、resetKey（選択中のノードや関連線の id）が変わったら value に戻す。
 * 選択が変わっても前の下書きが残ると、別のノードに保存されてしまうため
 */
export function useDraftValue(value: string, resetKey: string | undefined) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
    // value は resetKey が変わったときの値だけを使う（編集中に元の値が変わっても、下書きを上書きしない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return [draft, setDraft] as const;
}
