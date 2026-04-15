import React, { useState } from 'react';
import Editor from './components/Editor';
import SoloGenerator from './components/SoloGenerator';
import AudioToTab from './components/AudioToTab';

function App() {
  const [activeTab, setActiveTab] = useState('Solo Generator');
  const [sharedTabColumns, setSharedTabColumns] = useState(null);

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
      <nav className="bg-dark-surface border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo Placeholder */}
          <div className="w-8 h-8 rounded bg-dark-accent flex items-center justify-center text-dark-bg font-bold text-sm">
            TC
          </div>
          <h1 className="text-xl font-bold tracking-wide">TabCraft</h1>
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
      <main className="flex-grow flex flex-col p-6">
        <div className="flex-grow bg-dark-surface rounded-xl border border-gray-800 shadow-xl overflow-hidden relative transition-all duration-500">
          {renderView()}
        </div>
      </main>
    </div>
  );
}

export default App;
