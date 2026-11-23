import { useState, useRef, useEffect, useCallback } from 'react';

/** トーストの表示時間（ms） */
const TOAST_DURATION = 2500;

/** 画面上部に一時的に出す通知。エラーと警告だけに使う（ガイドライン 1.5） */
export function useToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // 前のトーストのタイマーが残っていると、次のトーストを早く消してしまうため、出し直すたびに止める
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, TOAST_DURATION);
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    []
  );

  return { toastMessage, showToast };
}
