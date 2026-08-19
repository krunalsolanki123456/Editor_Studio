import { useState } from 'react';
import { EditorStudio } from './EditorStudio';
import type { BlockInstance } from './editor/types';

export default function App() {
  const [, setBlocks] = useState<BlockInstance[]>([]);

  return (
    <div className="h-screen w-screen overflow-hidden">
      <EditorStudio
        onChange={(updatedBlocks) => setBlocks(updatedBlocks)}
        onSave={(savedBlocks, html) => {
          console.log('Saved blocks:', savedBlocks);
          console.log('Exported HTML:', html);
        }}
        // 🎯 4 Blocks Controlled by True/False Flags:
        enableLiveUpdates={true}  // 🔴 Live Updates Feed (false = Hide)
        enableEmbeds={true}       // 🎥 YouTube / Vimeo / Embeds (false = Hide)
        enablePolls={true}        // 🗳️ Live Polls & Voting (false = Hide)
        enableCharts={true}       // 📊 Election & Live Trackers Charts (false = Hide)

        // (Baki sabhi blocks: Text, Heading, Paragraph, List, Quote, Code, Images, Gallery, Tables, Layouts By-Default hamesha aayenge)
      />
    </div>
  );
}


