import React, { useState, useRef, useEffect } from 'react';
import { EditInputMode, PositionedNode } from '../types';
import { useTextareaAutoResize } from './useTextareaAutoResize';
import { NodeEditCallbacks, useNodeEditKeyDown } from './useNodeEditKeyDown';

interface UseNodeTextEditorParams extends NodeEditCallbacks {
  node: PositionedNode;
  isRoot: boolean;
  isEditing: boolean;
  /** 編集を始めたキーの文字。'' は IME の変換開始か、空の状態からの編集開始 */
  initialChar?: string | null;
  editInputMode: EditInputMode;
  /** キャンバスの IME プロキシで変換中の文字列（変換していなければ null） */
  imeMirrorText: string | null;
  lineHeight: number;
}

/** 最初の英字が IME の変換に置き換わるのを待つ時間（ms）。過ぎたら英字の入力とみなす */
const SPECULATIVE_CHAR_TIMEOUT = 600;

/** ノードのテキスト編集（編集中の文字列、編集の開始、IME、キー操作、確定） */
export function useNodeTextEditor({
  node,
  isRoot,
  isEditing,
  initialChar,
  editInputMode,
  imeMirrorText,
  lineHeight,
  ...callbacks
}: UseNodeTextEditorParams) {
  const [editText, setEditText] = useState(node.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);
  const justCompositionEndedRef = useRef(false);
  /** 最初の英字を入れる前の文字列（変換が始まったらここに戻す） */
  const prevTextBeforeInitialCharRef = useRef('');
  /** 最初の英字を入れたまま、まだ変換が始まっていないか */
  const initialCharAppliedRef = useRef(false);
  const initialCharTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { autoResize, overflowBoost, resetOverflowBoost, resetScrollLeft } = useTextareaAutoResize({ textareaRef, lineHeight });

  /** 編集欄の文字列を nextText にして、カーソルを末尾に置く（描画後に行う） */
  const setTextWithCursorAtEnd = (nextText: string) => {
    setEditText(nextText);
    setTimeout(() => {
      if (textareaRef.current) {
        const len = nextText.length;
        textareaRef.current.setSelectionRange(len, len);
        autoResize();
      }
    }, 0);
  };

  // ※ 以下の effect は、同じ描画で続けて動くことがあるため、順番を変えない

  // 編集していないときは、ノードの文字列に追従する
  useEffect(() => {
    if (!isEditing) {
      setEditText(node.text);
      resetOverflowBoost();
    }
  }, [node.text, isEditing, resetOverflowBoost]);

  const imeMirrorTextRef = useRef<string | null>(imeMirrorText);
  imeMirrorTextRef.current = imeMirrorText;
  const wasMirroringRef = useRef(false);

  // キャンバスの IME プロキシで変換中の文字を映し、確定したら編集欄にフォーカスを移す
  useEffect(() => {
    if (!isEditing) {
      wasMirroringRef.current = false;
      return;
    }
    if (imeMirrorText !== null) {
      wasMirroringRef.current = true;
      setEditText((editInputMode === 'append' ? node.text : '') + imeMirrorText);
      autoResize();
    } else if (wasMirroringRef.current && textareaRef.current) {
      wasMirroringRef.current = false;
      const textarea = textareaRef.current;
      textarea.focus();
      const len = textarea.value.length;
      textarea.setSelectionRange(len, len);
      autoResize();
    }
    // 変換中の文字が変わったとき、編集の開始と終わりのときだけ動かす。
    // autoResize は描画のたびに作り直される関数で、依存配列に入れると描画のたびに編集欄の文字を上書きしてしまう。
    // node.text と editInputMode は、動いた時点の最新の値を読めばよい（変換中に変わっても、次の入力で追いつく）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imeMirrorText, isEditing]);

  // 編集の開始
  useEffect(() => {
    if (!isEditing || !textareaRef.current) return;
    const textarea = textareaRef.current;
    // IME プロキシで変換中は、フォーカスをプロキシに残す
    if (imeMirrorTextRef.current === null) {
      textarea.focus();
    }

    if (initialCharTimerRef.current) {
      clearTimeout(initialCharTimerRef.current);
      initialCharTimerRef.current = null;
    }

    const base = editInputMode === 'append' ? node.text : '';
    if (initialChar !== undefined && initialChar !== null && initialChar !== '') {
      prevTextBeforeInitialCharRef.current = base;
      // 変換に置き換わる可能性があるのは、英字 1 文字だけ。IME プロキシで確定した文字（日本語など）は確定済み
      const isSpeculative = /^[\x20-\x7e]$/.test(initialChar);
      initialCharAppliedRef.current = isSpeculative;
      setTextWithCursorAtEnd(base + initialChar);
      // しばらく変換が始まらなければ、英字の入力とみなす
      if (isSpeculative) {
        initialCharTimerRef.current = setTimeout(() => {
          initialCharAppliedRef.current = false;
        }, SPECULATIVE_CHAR_TIMEOUT);
      }
    } else {
      initialCharAppliedRef.current = false;
      if (initialChar === '') {
        // IME の変換開始、または空の状態からの編集開始
        setTextWithCursorAtEnd(base);
      } else {
        setEditText(node.text);
        if (node.text) {
          textarea.select();
        }
      }
    }
    autoResize();
    // 編集の開始を決める 4 つの値だけを依存にしている。
    // autoResize と setTextWithCursorAtEnd は描画のたびに作り直される関数で、入れると 1 文字打つたびに
    // 「編集の開始」がやり直され、フォーカスの取り直しと文字の巻き戻しが起きる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, initialChar, editInputMode, node.text]);

  const handleCompositionStart = () => {
    isComposingRef.current = true;
    justCompositionEndedRef.current = false;
    // 最初の英字を入れたあとに変換が始まったら、その英字を取り除く（例：「a」→「あ」）
    if (initialCharAppliedRef.current) {
      const cleanText = prevTextBeforeInitialCharRef.current;
      setEditText(cleanText);
      if (textareaRef.current) {
        textareaRef.current.value = cleanText;
        const len = cleanText.length;
        textareaRef.current.setSelectionRange(len, len);
        textareaRef.current.scrollLeft = 0;
      }
      initialCharAppliedRef.current = false;
    }
    resetScrollLeft();
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
    // 確定の Enter をノードの追加に使わないよう、直後の 1 回だけ印を付ける
    justCompositionEndedRef.current = true;
    autoResize();
    resetScrollLeft();
    // 次のタスクで印を消し、その後の Enter は通常どおり扱う
    setTimeout(() => {
      justCompositionEndedRef.current = false;
    }, 0);
  };

  const handleKeyDown = useNodeEditKeyDown({
    node,
    isRoot,
    editText,
    setEditText,
    textareaRef,
    autoResize,
    isComposingRef,
    justCompositionEndedRef,
    ...callbacks,
  });

  const textareaHandlers = {
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setEditText(e.target.value);
      autoResize();
      resetScrollLeft();
    },
    onScroll: (e: React.UIEvent<HTMLTextAreaElement>) => {
      if (e.currentTarget.scrollLeft !== 0) {
        e.currentTarget.scrollLeft = 0;
      }
    },
    onCompositionStart: handleCompositionStart,
    onCompositionUpdate: () => {
      autoResize();
      resetScrollLeft();
    },
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown,
    onBlur: () => callbacks.onFinishEdit(node.id, editText.trim()),
  };

  return { editText, textareaRef, overflowBoost, textareaHandlers };
}
