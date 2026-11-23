import { t } from '../i18n';
import React, { useState, useEffect, useRef } from 'react';
import { MindMap, MindNode } from '../types';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';

interface SearchBarProps {
  isOpen: boolean;
  mindMap: MindMap;
  onClose: () => void;
  onSelectAndCenterNode: (nodeId: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  isOpen,
  mindMap,
  onClose,
  onSelectAndCenterNode,
}) => {
  const [query, setQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  const matchingNodeIds = (Object.values(mindMap.nodes) as MindNode[])
    .filter((n) => {
      if (!query.trim()) return false;
      const q = query.toLowerCase();
      return (
        n.text.toLowerCase().includes(q) ||
        (n.note && n.note.toLowerCase().includes(q))
      );
    })
    .map((n) => n.id);

  useEffect(() => {
    setCurrentIndex(0);
    if (matchingNodeIds.length > 0) {
      onSelectAndCenterNode(matchingNodeIds[0]);
    }
    // 検索語が変わったときだけ、先頭の一致を選ぶ。マップや選択が変わるたびに選び直すと、検索中の操作が戻されてしまう
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (matchingNodeIds.length === 0) return;
    const nextIdx = (currentIndex + 1) % matchingNodeIds.length;
    setCurrentIndex(nextIdx);
    onSelectAndCenterNode(matchingNodeIds[nextIdx]);
  };

  const handlePrev = () => {
    if (matchingNodeIds.length === 0) return;
    const prevIdx = (currentIndex - 1 + matchingNodeIds.length) % matchingNodeIds.length;
    setCurrentIndex(prevIdx);
    onSelectAndCenterNode(matchingNodeIds[prevIdx]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      id="mindmap-search-bar"
      className="fixed top-[4.75rem] right-6 z-50 bg-surface rounded-panel shadow-float border border-line p-2 flex items-center gap-2 max-w-[min(24rem,calc(100vw-3rem))] w-full focus-within:ring-2 focus-within:ring-accent"
    >
      <Search className="w-4 h-4 text-ink-muted shrink-0 ml-1.5" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('search.placeholder')}
        className="flex-1 bg-transparent text-ui-body text-ink-strong outline-none placeholder:text-ink-muted"
      />

      {query && (
        <span className="text-ui-caption text-ink-muted whitespace-nowrap">
          {matchingNodeIds.length > 0
            ? `${currentIndex + 1} / ${matchingNodeIds.length}`
            : t('search.notFound')}
        </span>
      )}

      {matchingNodeIds.length > 0 && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={handlePrev}
            className="p-1 hover:bg-surface-muted text-ink-muted rounded-control"
            title={t('search.prev')}
            aria-label={t('search.prevLabel')}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNext}
            className="p-1 hover:bg-surface-muted text-ink-muted rounded-control"
            title={t('search.next')}
            aria-label={t('search.nextLabel')}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <button
        onClick={onClose}
        title={t('common.closeWithKey')}
        aria-label={t('search.closeLabel')}
        className="p-1 hover:bg-surface-muted text-ink-muted hover:text-ink rounded-control transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
