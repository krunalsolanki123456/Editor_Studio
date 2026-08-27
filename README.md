# React Editor Studio 🚀

[![Live Demo](https://img.shields.io/badge/Live%20Demo-editor--studio.vercel.app-success.svg?style=flat-square&logo=vercel)](https://editor-studio-beige.vercel.app)
[![NPM Version](https://img.shields.io/npm/v/react-editor-studio.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/react-editor-studio)
[![NPM Downloads](https://img.shields.io/npm/dm/react-editor-studio.svg?style=flat-square&color=green)](https://www.npmjs.com/package/react-editor-studio)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/react-editor-studio?style=flat-square&color=purple)](https://bundlephobia.com/package/react-editor-studio)
[![License](https://img.shields.io/npm/l/react-editor-studio.svg?style=flat-square&color=orange)](https://github.com/krunalsolanki123456/Editor_Studio/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![React 18 & 19 Compatible](https://img.shields.io/badge/React-18%20%26%2019-61dafb.svg?style=flat-square)](https://react.dev/)

> **The next-generation block-based rich text and interactive media editor for React, Next.js, and TypeScript.** Build Notion-style documents, live election dashboards, interactive opinion polls, breaking news timelines, and export 100% standalone, responsive HTML with zero runtime dependencies.
>
> 🌐 **Live Interactive Demo:** [https://editor-studio-beige.vercel.app](https://editor-studio-beige.vercel.app)
> 📦 **NPM Package:** [https://www.npmjs.com/package/react-editor-studio](https://www.npmjs.com/package/react-editor-studio)

---

<p align="center">
  <img src="https://raw.githubusercontent.com/krunalsolanki123456/Editor_Studio/main/screenshots/screen-short-1.png" alt="React Editor Studio UI Canvas" width="100%" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/krunalsolanki123456/Editor_Studio/main/screenshots/screen-short-2.png" alt="React Editor Studio Block Library & Live Polls" width="100%" />
</p>

---

## 🌟 Why React Editor Studio?

| Feature | React Editor Studio | TipTap / ProseMirror | Editor.js | Slate.js |
|---|:---:|:---:|:---:|:---:|
| **Block-Based Architecture (Notion / Gutenberg style)** | ✅ Yes | ⚠️ Custom Setup | ✅ Yes | ⚠️ Custom Setup |
| **Live Opinion Polls & Real-Time Voting** | ✅ Built-in | ❌ No | ❌ No | ❌ No |
| **Interactive Election Trackers & Charts** | ✅ Built-in | ❌ No | ❌ No | ❌ No |
| **Live Updates Timeline Feed (Social Embeds)** | ✅ Built-in | ❌ No | ❌ No | ❌ No |
| **1-Click Standalone Clean HTML Exporter** | ✅ Zero-dependency | ⚠️ Manual | ⚠️ JSON Only | ⚠️ Manual |
| **Multi-Column Responsive Grid Layouts** | ✅ Built-in | ⚠️ Complex | ❌ Limited | ⚠️ Complex |
| **Tailwind CSS & Dark Mode Native** | ✅ Yes | ⚠️ Manual | ❌ No | ⚠️ Manual |
| **In-Line Interactive PDF Viewer** | ✅ Built-in | ❌ No | ❌ No | ❌ No |
| **Mobile Touch & 475px Responsive Toolbar** | ✅ Built-in | ⚠️ Partial | ⚠️ Partial | ⚠️ Partial |

---

## 📦 Installation

Install with your preferred package manager:

```bash
# NPM
npm install react-editor-studio

# Yarn
yarn add react-editor-studio

# PNPM
pnpm add react-editor-studio

# Bun
bun add react-editor-studio
```

---

## ⚡ Quick Start

### 1. Next.js (App Router / Pages Router)

```tsx
'use client'; // Required for Next.js App Router

import React, { useState } from 'react';
import { EditorStudio, type BlockInstance } from 'react-editor-studio';
import 'react-editor-studio/dist/style.css';

export default function ArticleEditorPage() {
  const [blocks, setBlocks] = useState<BlockInstance[]>([]);

  const handleSave = (savedBlocks: BlockInstance[], html: string) => {
    console.log('Saved JSON blocks:', savedBlocks);
    console.log('Clean exported HTML:', html);
  };

  return (
    <main className="w-screen h-screen">
      <EditorStudio
        theme="light"
        initialTitle="Breaking Story: Next-Gen Technology Unveiled"
        onChange={(currentBlocks) => setBlocks(currentBlocks)}
        onSave={handleSave}
        enableLiveUpdates={true}
        enableEmbeds={true}
        enablePolls={true}
        enableCharts={true}
      />
    </main>
  );
}
```

### 2. Vite + React + TypeScript

```tsx
import React, { useState } from 'react';
import { EditorStudio, type BlockInstance } from 'react-editor-studio';
import 'react-editor-studio/dist/style.css';

export default function App() {
  const [blocks, setBlocks] = useState<BlockInstance[]>([]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <EditorStudio
        theme="light"
        initialTitle="My First Article"
        onChange={(b) => setBlocks(b)}
        onSave={(b, html) => {
          // Send to API or Database
          fetch('/api/save-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks: b, html }),
          });
        }}
      />
    </div>
  );
}
```

---

## 🧩 Comprehensive Block Library

React Editor Studio includes over **25+ plug-and-play blocks** out of the box:

- 📝 **Typography**: Paragraph, Headings (H1–H6), Bullet List, Numbered List, Checklist, Blockquote, Pullquote, Verse, Preformatted Text.
- 🎨 **Layout & Containers**: Responsive Columns (1–4 columns, 50-50, 70-30, 30-70), Grid Groups, Horizontal Rows, Accordions, Separators, Spacers.
- 🖼️ **Media & Embeds**: Single Image, Dynamic Gallery Grid, Full-Width Cover Image with Overlay, Image Sliders, YouTube, Vimeo, Twitter/X, Instagram, Spotify, and Interactive PDF Viewer.
- 📊 **Interactive Data & Live Polls**:
  - **Live Opinion Polls**: Single-choice, multiple-choice, animated percentage bars, custom vote expiry, and customizable vote counts.
  - **Election Trackers & Visualizations**: Parliament Semi-Circle Arch, Tally Bar Progress, Candidate Head-to-Head Battle, and Vote Share Percentage.
- 🔴 **Live Updates Timeline Feed**:
  - Chronological live updates ticker with real-time timestamps, pinning, embed support (YouTube, Twitter, Instagram, Spotify), PDF documents, and inline media attachments.
- 💻 **Developer Tools**: Code Editor with auto-language detection, Syntax Highlighting, Inline HTML mode, and 1-click Markdown shortcuts.

---

## 📤 1-Click Clean HTML Exporter

Convert editor state into ultra-clean, semantic, standalone HTML with responsive styles ready to publish anywhere (WordPress, Ghost, Webflow, Custom CMS):

```tsx
import { exportToHtml, exportHtml } from 'react-editor-studio';

// Generate standalone HTML string from block array
const cleanHtmlString = exportToHtml(blocks);

// Output example:
// <div class="editor-studio-content">
//   <h1>My Headline</h1>
//   <p>Clean semantic text...</p>
// </div>
```

---

## ⚙️ Props & Configuration

| Prop | Type | Default | Description |
|---|---|---|---|
| `initialBlocks` | `BlockInstance[]` | `[]` | Pre-populate the canvas with existing block data |
| `initialTitle` | `string` | `""` | Set the default article / document title |
| `theme` | `'light' \| 'dark'` | `'light'` | Toggle between clean light mode and sleek dark mode |
| `onChange` | `(blocks: BlockInstance[]) => void` | `undefined` | Real-time callback triggered on every block edit |
| `onSave` | `(blocks: BlockInstance[], html: string) => void` | `undefined` | Callback fired when user clicks Save / Export |
| `autoSave` | `boolean` | `true` | Automatically saves state to local browser storage |
| `enableLiveUpdates` | `boolean` | `true` | Enable/Disable the Live Updates timeline ticker block |
| `enableEmbeds` | `boolean` | `true` | Enable/Disable social embeds (Twitter, Instagram, YouTube, Spotify) |
| `enablePolls` | `boolean` | `true` | Enable/Disable interactive opinion polls & voting blocks |
| `enableCharts` | `boolean` | `true` | Enable/Disable election charts & live data trackers |
| `allowedBlocks` | `string[]` | `undefined` | Optional whitelist of allowed block types |
| `disabledBlocks` | `string[]` | `undefined` | Optional blacklist of disabled block types |
| `className` | `string` | `""` | Custom Tailwind / CSS wrapper class |
| `hideToolbar` | `boolean` | `false` | Hide top formatting bar for minimal embedded views |

---

## ❓ Frequently Asked Questions (FAQ)

<details>
<summary><b>Can I use React Editor Studio with Next.js App Router (SSR)?</b></summary>
Yes! Just add <code>'use client';</code> at the top of your Next.js component file or load it dynamically with <code>next/dynamic</code> using <code>{ ssr: false }</code>.
</details>

<details>
<summary><b>Does exported HTML require any external JavaScript runtime?</b></summary>
No. The exported HTML generated by <code>exportToHtml(blocks)</code> is completely self-contained, responsive, and works in any standard web browser or CMS without loading external React scripts.
</details>

<details>
<summary><b>Is Tailwind CSS required in my project?</b></summary>
No. All required CSS styles are pre-compiled and bundled into <code>react-editor-studio/dist/style.css</code>. Simply import this single stylesheet in your root layout.
</details>

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to check out the [Issues page](https://github.com/krunalsolanki123456/Editor_Studio/issues).

---

## 📄 License

This project is [MIT](https://github.com/krunalsolanki123456/Editor_Studio/blob/main/LICENSE) licensed.

Created with ❤️ by [Krunal Solanki](https://github.com/krunalsolanki123456)
