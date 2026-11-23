import { describe, it, expect } from 'vitest';
import { addRelationship, findRelationshipBetween, removeRelationship, updateRelationship } from './relationshipOperations';
import { createDefaultMindMap } from './treeOperations';
import type { MindMap } from '../types';

const setup = () => {
  const map = createDefaultMindMap();
  const [a, b, c] = Object.keys(map.nodes).filter((id) => id !== map.rootId);
  return { map, a, b, c };
};

describe('addRelationship', () => {
  it('点線・片方向矢印の関連線を追加すること', () => {
    const { map, a, b } = setup();
    const { updatedMap, relId } = addRelationship(map, a, b);
    expect(updatedMap.relationships?.[relId]).toEqual({ id: relId, sourceId: a, targetId: b, style: 'dashed', arrow: 'forward' });
  });

  it('既存の関連線を残し、元のマップを書き換えないこと', () => {
    const { map, a, b, c } = setup();
    const first = addRelationship(map, a, b);
    const second = addRelationship(first.updatedMap, b, c);
    expect(Object.keys(second.updatedMap.relationships || {})).toHaveLength(2);
    expect(map.relationships).toBeUndefined();
    expect(Object.keys(first.updatedMap.relationships || {})).toHaveLength(1);
  });
});

describe('findRelationshipBetween', () => {
  it('向きを問わず関連線を見つけること', () => {
    const { map, a, b } = setup();
    const { updatedMap, relId } = addRelationship(map, a, b);
    expect(findRelationshipBetween(updatedMap, a, b)?.id).toBe(relId);
    expect(findRelationshipBetween(updatedMap, b, a)?.id).toBe(relId);
  });

  it('関連線がなければ undefined を返すこと', () => {
    const { map, a, b, c } = setup();
    expect(findRelationshipBetween(map, a, b)).toBeUndefined();
    expect(findRelationshipBetween(addRelationship(map, a, b).updatedMap, a, c)).toBeUndefined();
  });
});

describe('updateRelationship / removeRelationship', () => {
  const withRel = (): { map: MindMap; relId: string } => {
    const { map, a, b } = setup();
    const { updatedMap, relId } = addRelationship(map, a, b);
    return { map: updatedMap, relId };
  };

  it('関連線の一部の項目だけを更新すること', () => {
    const { map, relId } = withRel();
    const updated = updateRelationship(map, relId, { style: 'solid', label: '原因' });
    expect(updated.relationships?.[relId]).toMatchObject({ style: 'solid', label: '原因', arrow: 'forward' });
    expect(map.relationships?.[relId].style).toBe('dashed');
  });

  it('関連線を削除すること', () => {
    const { map, relId } = withRel();
    expect(removeRelationship(map, relId).relationships?.[relId]).toBeUndefined();
    expect(map.relationships?.[relId]).toBeDefined();
  });

  it('存在しない関連線では、同じマップを返すこと', () => {
    const { map } = withRel();
    expect(updateRelationship(map, 'missing', { style: 'solid' })).toBe(map);
    expect(removeRelationship(map, 'missing')).toBe(map);
  });
});
