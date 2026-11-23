/** ノードの id を作る（乱数 + 時刻） */
export function generateId(): string {
  return 'node_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}
