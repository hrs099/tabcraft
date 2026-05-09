import React, { useState, useEffect } from 'react';
import Editor from './components/Editor';
import SoloGenerator from './components/SoloGenerator';
import AudioToTab from './components/AudioToTab';

function App() {
  const [activeTab, setActiveTab] = useState('Solo Generator');
  const [sharedTabColumns, setSharedTabColumns] = useState(null);

  // On mount: if ?tab= URL param present, open the Editor with decoded tab
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab')) {
        setActiveTab('Editor');
      }
    } catch (_) {}
  }, []);

  const handleOpenInEditor = (columns) => {
    setSharedTabColumns(columns);
    setActiveTab('Editor');
  };

  const renderView = () => {
    switch (activeTab) {
      case 'Editor': return <Editor initialColumns={sharedTabColumns} />;
      case 'Solo Generator': return <SoloGenerator onOpenInEditor={handleOpenInEditor} />;
      case 'Audio -> Tab': return <AudioToTab onOpenInEditor={handleOpenInEditor} />;
      default: return <Editor />;
    }
  };

  const navItems = ['Editor', 'Solo Generator', 'Audio -> Tab'];

  return (
    <div className="min-h-screen bg-dark-bg text-gray-200 font-sans flex flex-col">
      {/* Navbar */}
      <nav className="bg-dark-surface border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-dark-accent flex items-center justify-center text-dark-bg font-bold text-sm shadow-[0_0_10px_rgba(88,166,255,0.4)]">
            TC
          </div>
          <h1 className="text-xl font-bold tracking-wide">TabCraft</h1>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#58a6ff]/10 border border-[#58a6ff]/30 text-[#58a6ff] font-bold hidden sm:inline">
            v2.0
          </span>
        </div>
        
        <div className="flex space-x-2">
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => setActiveTab(item)}
              className={`px-4 py-2 rounded-md transition-all duration-300 font-medium ${
                activeTab === item 
                  ? 'bg-dark-accent text-dark-bg shadow-[0_0_15px_rgba(88,166,255,0.4)]' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col p-4">
        <div className="flex-grow bg-dark-surface rounded-xl border border-gray-800 shadow-xl overflow-hidden relative transition-all duration-500">
          {renderView()}
        </div>
      </main>
    </div>
  );
}

export default App;
