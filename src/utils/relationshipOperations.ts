import type { MindMap, MindRelationship } from '../types';
import { generateId } from './id';

/** 2 つのノードの間の関連線（向きは問わない） */
export function findRelationshipBetween(map: MindMap, a: string, b: string): MindRelationship | undefined {
  return Object.values(map.relationships || {}).find(
    (r) => (r.sourceId === a && r.targetId === b) || (r.sourceId === b && r.targetId === a)
  );
}

/** 関連線を追加する。新しい関連線は点線・片方向矢印 */
export function addRelationship(
  map: MindMap,
  sourceId: string,
  targetId: string
): { updatedMap: MindMap; relId: string } {
  const relId = generateId();
  const newRel: MindRelationship = {
    id: relId,
    sourceId,
    targetId,
    style: 'dashed',
    arrow: 'forward',
  };
  return {
    relId,
    updatedMap: {
      ...map,
      relationships: { ...(map.relationships || {}), [relId]: newRel },
      updatedAt: Date.now(),
    },
  };
}

/** 関連線を更新する。存在しなければ map をそのまま返す */
export function updateRelationship(map: MindMap, relId: string, partial: Partial<MindRelationship>): MindMap {
  const current = map.relationships?.[relId];
  if (!map.relationships || !current) return map;
  return {
    ...map,
    relationships: { ...map.relationships, [relId]: { ...current, ...partial } },
    updatedAt: Date.now(),
  };
}

/** 関連線を削除する。存在しなければ map をそのまま返す */
export function removeRelationship(map: MindMap, relId: string): MindMap {
  if (!map.relationships || !map.relationships[relId]) return map;
  const relationships = { ...map.relationships };
  delete relationships[relId];
  return { ...map, relationships, updatedAt: Date.now() };
}
