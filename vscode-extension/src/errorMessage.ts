/** catch で受けた unknown から、表示用のメッセージを取り出す */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
