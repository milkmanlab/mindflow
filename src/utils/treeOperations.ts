// ツリー操作の入口。MindMap を受け取り、書き換えずに新しい MindMap を返す純粋関数を、ここからまとめて公開する。
// 実装は役割ごとに utils/tree/ にある。新しい操作を足すときは、tree/ の該当するファイルに書き、ここに追加する
export { generateId } from './id';
export { createDefaultMindMap } from './defaultMindMap';
export { getChildren, getDescendantIds } from './tree/treeQueries';
export { addChildNode, addSiblingNode } from './tree/nodeAddition';
export { deleteNode, deleteNodes } from './tree/nodeDeletion';
export {
  updateNodeText,
  updateNodeProps,
  updateMultipleNodesProps,
  updateMapFontFamily,
} from './tree/nodeUpdate';
export { toggleFoldNode, expandAllNodes, collapseAllNodes } from './tree/nodeFolding';
export { reorderOrReparentNode, reparentNode, moveSiblingOrder } from './tree/nodeMove';
export type { DropPosition } from './tree/nodeMove';
export { copySubtree } from './tree/nodeCopy';
