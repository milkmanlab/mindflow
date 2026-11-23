import { useCallback } from 'react';
import { MindNode } from '../types';
import { readImageFile } from '../services/imageService';
import { imageProps } from '../utils/imageBox';

/**
 * 画像ファイルを縮小してノードに付ける関数を返す。
 * ドロップ・ペースト・プロパティバーのファイル選択のすべてが、この 1 つを通る
 */
export function useImageAttach(updateNodeProps: (nodeId: string, partial: Partial<MindNode>) => void) {
  return useCallback(
    async (nodeId: string, file: File) => {
      const { dataUrl, size } = await readImageFile(file);
      updateNodeProps(nodeId, imageProps(dataUrl, size));
    },
    [updateNodeProps]
  );
}
