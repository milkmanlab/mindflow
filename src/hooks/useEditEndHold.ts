import { useEffect, useRef, useState } from 'react';

/**
 * マウスのボタンを押したまま文字の編集が終わったとき（キャンバスや別のノードのクリックでフォーカスが外れたとき）、
 * ボタンを離すまで、編集していたノードのバーと「＋」を出さないための状態。
 *
 * フォーカスが外れるのは mousedown の時点で、選択が変わるのは離したあとの click。
 * その間、選択されたままのノードのバーと「＋」が一瞬だけ出るのを防ぐ。
 * Esc などボタンを押していないときに終えたときは、何も保留しない（すぐ出る）
 *
 * @returns 保留中のノードの id。なければ null
 */
export function useEditEndHold(editingNodeId: string | null): string | null {
  const [heldNodeId, setHeldNodeId] = useState<string | null>(null);
  const isPointerDownRef = useRef(false);
  const previousEditingRef = useRef<string | null>(null);

  // ボタンの押下を追う。キャンバスやノードが伝わりを止めても見えるよう、キャプチャで受ける
  useEffect(() => {
    const handleDown = () => {
      isPointerDownRef.current = true;
    };
    const handleUp = () => {
      isPointerDownRef.current = false;
      setHeldNodeId(null);
    };
    window.addEventListener('mousedown', handleDown, true);
    window.addEventListener('mouseup', handleUp, true);
    // ドラッグ＆ドロップの終わりと、ウィンドウの外で離したときは mouseup が届かない
    window.addEventListener('dragend', handleUp);
    window.addEventListener('blur', handleUp);
    return () => {
      window.removeEventListener('mousedown', handleDown, true);
      window.removeEventListener('mouseup', handleUp, true);
      window.removeEventListener('dragend', handleUp);
      window.removeEventListener('blur', handleUp);
    };
  }, []);

  // 編集が終わった瞬間にボタンを押していたら、そのノードを保留する
  useEffect(() => {
    const previous = previousEditingRef.current;
    previousEditingRef.current = editingNodeId;
    if (previous && !editingNodeId && isPointerDownRef.current) {
      setHeldNodeId(previous);
    }
  }, [editingNodeId]);

  return heldNodeId;
}
