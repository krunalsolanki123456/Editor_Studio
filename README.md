# React Editor Studio 🚀

A modern, responsive, block-based rich text and interactive media editor built with **React**, **TypeScript**, and **Tailwind CSS**.

<p align="center">
  <img src="https://raw.githubusercontent.com/krunalsolanki123456/Editor_Studio/main/screenshots/screen-short-1.png" alt="React Editor Studio Preview 1" width="100%" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/krunalsolanki123456/Editor_Studio/main/screenshots/screen-short-2.png" alt="React Editor Studio Preview 2" width="100%" />
</p>

Features full support for:
- 🗳️ **Public Opinion Polls & Live Voting**
- 🔴 **Live Updates Timeline Feed (YouTube, Twitter/X, Instagram, Spotify, PDF & Video)**
- 📊 **Interactive Charts & Live Trackers (Parliament Arch, Tally Bar, Candidate Head-to-Head Battle, Vote Share %)**
- ✍️ **Rich Text, Headers, Blockquotes, Code, Tables, Galleries, Sliders & More**
- 📑 **1-Click Clean Responsive HTML Export & Preview**

---

## 📦 Installation

```bash
npm install react-editor-studio
# or
yarn add react-editor-studio
# or
pnpm add react-editor-studio
```

---

## ⚡ Quick Start

### React (JavaScript / JSX)

```jsx
import React, { useState } from 'react';
import { EditorStudio } from 'react-editor-studio';
import 'react-editor-studio/dist/style.css';

export default function App() {
  const [blocks, setBlocks] = useState([]);

  const handleSave = (savedBlocks, html) => {
    console.log('Saved Blocks JSON:', savedBlocks);
    console.log('Exported Clean HTML:', html);
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <EditorStudio
        theme="light"
        initialTitle="My Breaking News Story"
        onChange={(currentBlocks) => setBlocks(currentBlocks)}
        onSave={handleSave}
        enableLiveUpdates={true}
        enableEmbeds={true}
        enablePolls={true}
        enableCharts={true}
      />
    </div>
  );
}
```

### TypeScript (TSX)

```tsx
import React, { useState } from 'react';
import { EditorStudio, type BlockInstance } from 'react-editor-studio';
import 'react-editor-studio/dist/style.css';

export default function App() {
  const [blocks, setBlocks] = useState<BlockInstance[]>([]);

  const handleSave = (savedBlocks: BlockInstance[], html: string) => {
    console.log('Saved Blocks JSON:', savedBlocks);
    console.log('Exported Clean HTML:', html);
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <EditorStudio
        theme="light"
        initialTitle="My Breaking News Story"
        onChange={(currentBlocks) => setBlocks(currentBlocks)}
        onSave={handleSave}
        enableLiveUpdates={true}
        enableEmbeds={true}
        enablePolls={true}
        enableCharts={true}
      />
    </div>
  );
}
```

---

## 🛠️ Props & Configuration

| Prop | Type | Default | Description |
|---|---|---|---|
| `initialBlocks` | `BlockInstance[]` | `[]` | Pre-load initial blocks (e.g. from database or template) |
| `initialTitle` | `string` | `""` | Initial document/article title |
| `theme` | `'light' \| 'dark'` | `'light'` | Editor color theme |
| `onChange` | `(blocks: BlockInstance[]) => void` | `undefined` | Callback fired on real-time block mutations |
| `onSave` | `(blocks: BlockInstance[], html: string) => void` | `undefined` | Callback triggered when user clicks Save / Export |
| `autoSave` | `boolean` | `true` | Persist editor state automatically across page reloads (localStorage + IndexedDB) |
| `enableLiveUpdates` | `boolean` | `true` | Enable/Disable Live Updates Timeline Feed block |
| `enableEmbeds` | `boolean` | `true` | Enable/Disable YouTube, Vimeo & rich social media embeds |
| `enablePolls` | `boolean` | `true` | Enable/Disable Live Opinion Polls & Voting block |
| `enableCharts` | `boolean` | `true` | Enable/Disable Live Trackers & Election Charts |
| `allowedBlocks` | `string[]` | `undefined` | Optional whitelist of allowed block types |
| `disabledBlocks` | `string[]` | `undefined` | Optional blacklist of disabled block types |
| `className` | `string` | `""` | Custom CSS wrapper class |
| `hideToolbar` | `boolean` | `false` | Hide top header toolbar if embedding in custom UI |

---

## 📤 Export Utilities

Convert your editor state to clean, standalone, responsive HTML with zero runtime dependencies:

```tsx
import { exportToHtml, exportHtml } from 'react-editor-studio';

// Get clean HTML string ready to embed in CMS, WordPress, or websites
const cleanHtml = exportToHtml(blocks);
```

---

## 🚢 Publishing to NPM

To publish this package to NPM:

```bash
# 1. Build the library and generate TypeScript declarations
npm run build:lib

# 2. Login to your NPM account (one-time)
npm login

# 3. Publish to NPM registry
npm publish --access public
```

---

## 📄 License
MIT © 2026 Editor Studio

