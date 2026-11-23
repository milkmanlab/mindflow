import React from 'react';
import { LayoutResult, MindRelationship, ThemeConfig } from '../types';
import { computeRelationshipGeometry } from '../utils/relationshipGeometry';

interface RelationshipLayerProps {
  relationships?: Record<string, MindRelationship>;
  layout: LayoutResult;
  selectedRelationshipId: string | null;
  onSelectRelationship: (relId: string | null) => void;
  theme: ThemeConfig;
}

export const RelationshipLayer: React.FC<RelationshipLayerProps> = ({
  relationships,
  layout,
  selectedRelationshipId,
  onSelectRelationship,
  theme,
}) => {
  if (!relationships || Object.keys(relationships).length === 0) {
    return null;
  }

  const relList = Object.values(relationships) as MindRelationship[];

  return (
    <g id="mindflow-relationships-layer" className="pointer-events-auto">
      {relList.map((rel, index) => {
        const sourceNode = layout.nodeMap.get(rel.sourceId);
        const targetNode = layout.nodeMap.get(rel.targetId);
        if (!sourceNode || !targetNode) return null;

        const isSelected = selectedRelationshipId === rel.id;

        const { pathD, mid } = computeRelationshipGeometry(sourceNode, targetNode);

        // 選択中でも線そのものの色は変えない（色を変えた結果がその場で見えるようにする）。
        // 選択は、線の下に敷くアクセント色の帯と、線の太さで表す
        const strokeColor = rel.color || (theme.isDark ? '#94a3b8' : '#64748b');
        const strokeWidth = isSelected ? 2.5 : 1.8;
        const strokeDasharray = rel.style === 'solid' ? undefined : '5 4';

        const arrowMode = rel.arrow || 'forward';
        // 矢印の先は線と同じ色にするため、関連線ごとにマーカーを持つ。
        // id は Markdown から読んだ値なので url(#...) には使わず、並び順の番号を使う
        const markerId = `rel-arrow-${index}`;
        const markerEnd = arrowMode === 'none' ? undefined : `url(#${markerId})`;
        const markerStart = arrowMode === 'both' ? `url(#${markerId})` : undefined;

        return (
          <g
            key={rel.id}
            className="cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation();
              onSelectRelationship(isSelected ? null : rel.id);
            }}
          >
            {arrowMode !== 'none' && (
              <defs>
                <marker
                  id={markerId}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill={strokeColor} />
                </marker>
              </defs>
            )}

            {/* 太い透明パス（クリックしやすくするためのヒットエリア） */}
            <path d={pathD} fill="none" stroke="transparent" strokeWidth={16} />

            {/* 選択中の印（線の下に敷くアクセント色の帯） */}
            {isSelected && (
              <path
                d={pathD}
                fill="none"
                stroke={theme.accent}
                strokeOpacity={0.3}
                strokeWidth={9}
                strokeLinecap="round"
              />
            )}

            {/* 実線または点線のリレーション線 */}
            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              markerStart={markerStart}
              markerEnd={markerEnd}
              className={isSelected ? undefined : 'transition-colors group-hover:stroke-accent'}
            />

            {/* ラベルバッジ（ラベルがある場合） */}
            {rel.label && (
              <g transform={`translate(${mid.x}, ${mid.y})`}>
                <rect
                  x={-(rel.label.length * 5.5 + 10)}
                  y={-10}
                  width={rel.label.length * 11 + 20}
                  height={20}
                  rx={6}
                  fill={theme.isDark ? '#1e293b' : '#ffffff'}
                  stroke={strokeColor}
                  strokeWidth={1}
                />
                <text
                  x={0}
                  y={3.5}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight="bold"
                  fill={theme.isDark ? '#e2e8f0' : '#334155'}
                  className="select-none pointer-events-none"
                >
                  {rel.label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};
