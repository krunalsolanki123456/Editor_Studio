# React Editor Studio 🚀

A modern, responsive, block-based rich text and interactive media editor built with **React**, **TypeScript**, and **Tailwind CSS**.

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

```tsx
import React, { useState } from 'react';
import { EditorStudio, exportToHtml, BlockInstance } from 'react-editor-studio';
import 'react-editor-studio/dist/style.css';

export default function App() {
  const [blocks, setBlocks] = useState<BlockInstance[]>([]);

  const handleSave = (savedBlocks: BlockInstance[]) => {
    console.log('Saved Blocks JSON:', savedBlocks);
    const htmlOutput = exportToHtml(savedBlocks);
    console.log('Clean HTML Output:', htmlOutput);
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <EditorStudio
        theme="light"
        initialTitle="My Breaking News Story"
        onChange={(currentBlocks) => setBlocks(currentBlocks)}
        onSave={handleSave}
      />
    </div>
  );
}
```

---

## 🛠️ Props & Configuration

| Prop | Type | Default | Description |
|---|---|---|---|
| `initialBlocks` | `BlockInstance[]` | `[]` | Pre-load existing editor blocks (e.g. from database) |
| `initialTitle` | `string` | `""` | Initial document/article title |
| `theme` | `'light' \| 'dark'` | `'light'` | Editor color theme |
| `onChange` | `(blocks: BlockInstance[]) => void` | `undefined` | Callback fired on every real-time block mutation |
| `onSave` | `(blocks: BlockInstance[], html: string) => void` | `undefined` | Callback triggered when user saves |
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
