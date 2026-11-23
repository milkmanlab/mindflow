# Changelog

## 1.0.0

First release.

- Create a new map with `MindFlow: Create New Mind Map`. It creates `Untitled-N.mindflow.md` and opens it, and `.mindflow.md` files open as mind maps when clicked.
- Open any `.md` / `.markdown` file as a mind map (right-click → Open With → MindFlow, or the command `MindFlow: Open as Mind Map`).
- Two-way sync with the Markdown text. The unsaved indicator works with VS Code. Undo/redo (Ctrl/Cmd+Z / Y, up to 100 steps) works inside the map; editing the text elsewhere starts a fresh history.
- Keyboard-first editing, drag and drop, multi-select, copy and paste, search, minimap and zoom.
- Three layouts, four themes, four connector styles, font choice.
- Task progress, notes, images (paste or attach), collapsing, and relationship arrows between nodes.
- Save as PNG or SVG.
- English and Japanese UI. The `mindflow.language` setting picks the language (`auto` follows the VS Code display language).
