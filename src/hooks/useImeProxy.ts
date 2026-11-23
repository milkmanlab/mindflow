import React, { useRef, useState, useEffect, useCallback } from 'react';

interface UseImeProxyParams {
  selectedNodeId: string | null;
  editingNodeId: string | null;
  onStartEditNode: (nodeId: string, initialChar?: string) => void;
}

/**
 * IME プロキシ。Chromium は編集可能な要素にフォーカスがないと IME を無効にするため、
 * ノードを選択中（編集中ではない）は透明な textarea にフォーカスを置いておく。
 * そこで変換が始まったら、フォーカスはプロキシに残したまま、ノードの編集欄に入力中の文字を映し、
 * 確定したら編集欄にフォーカスを渡す。
 */
export function useImeProxy({ selectedNodeId, editingNodeId, onStartEditNode }: UseImeProxyParams) {
  const imeProxyRef = useRef<HTMLTextAreaElement>(null);
  /** 変換中の文字列。ノードの編集欄がこれを表示する。変換していないときは null */
  const [imeMirrorText, setImeMirrorText] = useState<string | null>(null);

  // IME の候補ウィンドウがノードの横に出るよう、プロキシをノードに重ねる
  const positionImeProxy = useCallback((nodeId: string | null) => {
    const proxy = imeProxyRef.current;
    const rect = nodeId ? document.getElementById(`node-${nodeId}`)?.getBoundingClientRect() : null;
    if (!proxy || !rect) return;
    proxy.style.left = `${rect.left}px`;
    proxy.style.top = `${rect.top}px`;
    proxy.style.width = `${rect.width}px`;
    proxy.style.height = `${rect.height}px`;
  }, []);

  useEffect(() => {
    const proxy = imeProxyRef.current;
    if (!proxy || !selectedNodeId || editingNodeId) return;
    const active = document.activeElement as HTMLElement | null;
    const isOtherInputFocused =
      active !== proxy &&
      (['INPUT', 'TEXTAREA', 'SELECT'].includes(active?.tagName || '') || Boolean(active?.isContentEditable));
    if (isOtherInputFocused) return;
    positionImeProxy(selectedNodeId);
    proxy.focus({ preventScroll: true });
  }, [selectedNodeId, editingNodeId, positionImeProxy]);

  const handleCompositionStart = () => {
    if (!selectedNodeId) return;
    positionImeProxy(selectedNodeId);
    // すぐに編集モードに入る。編集欄はプロキシの文字を映すだけで、まだフォーカスを取らない
    setImeMirrorText('');
    onStartEditNode(selectedNodeId, '');
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    e.currentTarget.value = '';
    setImeMirrorText(null);
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const value = e.currentTarget.value;
    if ((e.nativeEvent as InputEvent).isComposing) {
      setImeMirrorText(value);
    } else {
      // 変換を経ない入力はプロキシに残さない
      e.currentTarget.value = '';
    }
  };

  return { imeProxyRef, imeMirrorText, handleCompositionStart, handleCompositionEnd, handleInput };
}
