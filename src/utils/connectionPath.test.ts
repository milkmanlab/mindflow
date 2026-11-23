import { describe, it, expect } from 'vitest';
import { createConnection, ConnectionParams } from './connectionPath';

const parent = { x: 0, y: 0, width: 100, height: 40 };

const makeParams = (overrides: Partial<ConnectionParams> = {}): ConnectionParams => ({
  parent,
  child: { x: 200, y: 100, width: 80, height: 20 },
  side: 'right',
  sourceId: 'p',
  targetId: 'c',
  color: '#123456',
  isRootBranch: false,
  style: 'curved',
  ...overrides,
});

describe('createConnection', () => {
  it('id・色・階層 1 かどうかをそのまま入れること', () => {
    const conn = createConnection(makeParams({ isRootBranch: true }));
    expect(conn).toMatchObject({ id: 'p->c', sourceId: 'p', targetId: 'c', color: '#123456', isRootBranch: true });
  });

  it('右側の子には、親の右辺の中央から子の左辺の中央へ引くこと', () => {
    const conn = createConnection(makeParams());
    expect(conn.sourcePoint).toEqual({ x: 100, y: 20 });
    expect(conn.targetPoint).toEqual({ x: 200, y: 110 });
  });

  it('左側の子には、親の左辺の中央から子の右辺の中央へ引くこと', () => {
    const conn = createConnection(makeParams({ side: 'left', child: { x: -180, y: 100, width: 80, height: 20 } }));
    expect(conn.sourcePoint).toEqual({ x: 0, y: 20 });
    expect(conn.targetPoint).toEqual({ x: -100, y: 110 });
  });

  it('straight は直線になること', () => {
    expect(createConnection(makeParams({ style: 'straight' })).path).toBe('M 100 20 L 200 110');
  });

  it('curved は、横の距離の 45% の位置に制御点を置いた曲線になること', () => {
    expect(createConnection(makeParams()).path).toBe('M 100 20 C 145 20, 155 110, 200 110');
  });

  it('curved の左側は、制御点が左右反対になること', () => {
    const conn = createConnection(makeParams({ side: 'left', child: { x: -180, y: 100, width: 80, height: 20 } }));
    expect(conn.path).toBe('M 0 20 C -45 20, -55 110, -100 110');
  });

  it('rounded は、中間で直角に曲がり、角を半径 16 で丸めること', () => {
    expect(createConnection(makeParams({ style: 'rounded' })).path).toBe(
      'M 100 20 L 134 20 Q 150 20 150 36 L 150 94 Q 150 110 166 110 L 200 110'
    );
  });

  it('rounded で子が上にあるとき、縦の向きが反対になること', () => {
    const conn = createConnection(makeParams({ style: 'rounded', child: { x: 200, y: -100, width: 80, height: 20 } }));
    expect(conn.path).toBe('M 100 20 L 134 20 Q 150 20 150 4 L 150 -74 Q 150 -90 166 -90 L 200 -90');
  });

  it('rounded で高さの差が小さいとき、角の半径を差の半分まで小さくすること', () => {
    // 始点 y=20、終点 y=30（差 10）→ 半径 5
    const conn = createConnection(makeParams({ style: 'rounded', child: { x: 200, y: 20, width: 80, height: 20 } }));
    expect(conn.path).toBe('M 100 20 L 145 20 Q 150 20 150 25 L 150 25 Q 150 30 155 30 L 200 30');
  });

  it('rounded で高さの差が 4 未満のとき、直線になること', () => {
    // 始点 y=20、終点 y=23
    const conn = createConnection(makeParams({ style: 'rounded', child: { x: 200, y: 13, width: 80, height: 20 } }));
    expect(conn.path).toBe('M 100 20 L 200 23');
  });

  it('arc は、横の距離の 40% の位置、終点の高さに制御点を置いた 2 次曲線になること', () => {
    expect(createConnection(makeParams({ style: 'arc' })).path).toBe('M 100 20 Q 140 110 200 110');
  });

  it('arc の左側は、制御点が左右反対になること', () => {
    const conn = createConnection(makeParams({ style: 'arc', side: 'left', child: { x: -180, y: 100, width: 80, height: 20 } }));
    expect(conn.path).toBe('M 0 20 Q -40 110 -100 110');
  });

  it('子が「下線のみ」のとき、終点を下線の高さ（下端の 1px 上）にすること', () => {
    const conn = createConnection(makeParams({ child: { x: 200, y: 100, width: 80, height: 20, shape: 'underline', depth: 1 } }));
    expect(conn.targetPoint).toEqual({ x: 200, y: 119 });
    expect(conn.path).toBe('M 100 20 C 145 20, 155 119, 200 119');
  });

  it('親が「下線のみ」のとき、始点を下線の高さにすること', () => {
    const conn = createConnection(makeParams({ parent: { ...parent, shape: 'underline', depth: 1 } }));
    expect(conn.sourcePoint).toEqual({ x: 100, y: 39 });
  });

  it('ルートは、形が「下線のみ」でも辺の中央につなぐこと', () => {
    const conn = createConnection(makeParams({ parent: { ...parent, shape: 'underline', depth: 0 } }));
    expect(conn.sourcePoint).toEqual({ x: 100, y: 20 });
  });
});
