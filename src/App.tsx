import { useState } from 'react';
import { EditorStudio } from './EditorStudio';
import type { BlockInstance } from './editor/types';

const defaultBlocks: BlockInstance[] = [
  {
    id: 'demo-heading',
    type: 'heading',
    attributes: { content: [{ text: 'Breaking News: Today Live Election & Updates' }], level: 1 },
  },
  {
    id: 'demo-paragraph',
    type: 'paragraph',
    attributes: { content: [{ text: 'Welcome to React Editor Studio. Edit this content or insert new blocks from the sidebar.' }] },
  },
  {
    id: 'demo-poll',
    type: 'poll',
    attributes: {
      question: 'Do you find this new block configuration useful?',
      options: [
        { id: 'opt-1', text: 'Yes, absolutely! 🚀', votes: 12 },
        { id: 'opt-2', text: 'Needs more features 💡', votes: 3 },
      ],
      totalVotes: 15,
      allowMultiple: false,
    },
  },
];

export default function App() {
  const [blocks, setBlocks] = useState<BlockInstance[]>(defaultBlocks);

  return (
    <div className="h-screen w-screen overflow-hidden">
      <EditorStudio
        initialTitle="Breaking Story"
        initialBlocks={blocks}
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


