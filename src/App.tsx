import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import * as Icons from 'lucide-react';
import { Plus, LayoutTemplate, FileText, Tag, Search, Trash2, Video, Image as ImageIcon, Palette, X } from 'lucide-react';
import { SiteConfig, TabData, CardData } from './types';
import { FakeBrowser } from './components/FakeBrowser';
import { PublishSidebar } from './components/PublishSidebar';

// Helper to render dynamic Lucide icons
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (Icons as any)[name] || Icons.Folder;
  return <IconComponent className={className} />;
};

export default function App() {
  const [config, setConfig] = useState<SiteConfig>({
    browserTitle: 'My Dojo',
    favicon: '',
    heroTitle: 'Shito-Ryu Karate Portal',
    heroDescription: 'Welcome to our dojo. Learn discipline, respect, and self-defense.',
    heroImage: '',
    theme: {
      primaryColor: '#10b981',
      backgroundColor: '#f9fafb',
      cardColor: '#ffffff',
      textColor: '#1f2937'
    },
    tabs: [],
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [showThemeSettings, setShowThemeSettings] = useState(false);

  const heroImageInputRef = useRef<HTMLInputElement>(null);

  // --- Gemini AI Integration for Icons ---
  const generateIconForTab = async (tabName: string, tabId: string) => {
    if (!tabName.trim()) return;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are an assistant that selects an appropriate icon for a karate dojo website tab.
        The tab is named: "${tabName}".
        Return ONLY the exact name of a Lucide React icon (PascalCase).
        Examples: Swords, User, Video, Info, Home, Shield, Award, BookOpen, Users.
        Do not return any other text.`,
      });
      
      const suggestedIcon = response.text?.trim() || 'Folder';
      
      setConfig(prev => ({
        ...prev,
        tabs: prev.tabs.map(t => t.id === tabId ? { ...t, iconName: suggestedIcon } : t)
      }));
    } catch (e) {
      console.error("Failed to generate icon", e);
    }
  };

  // --- Handlers ---
  const handleAddTab = (type: 'video' | 'about') => {
    const newTab: TabData = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      name: type === 'video' ? 'New Tab' : 'About Us',
      iconName: type === 'video' ? 'Folder' : 'Info',
      cards: [],
      aboutText: type === 'about' ? 'Enter your about information here...' : undefined,
      aboutImage: '',
    };
    setConfig(prev => ({ ...prev, tabs: [...prev.tabs, newTab] }));
    setActiveTabId(newTab.id);
  };

  const handleUpdateTabName = (tabId: string, newName: string) => {
    setConfig(prev => ({
      ...prev,
      tabs: prev.tabs.map(t => t.id === tabId ? { ...t, name: newName } : t)
    }));
  };

  const handleTabNameBlur = (tabId: string, name: string) => {
    generateIconForTab(name, tabId);
  };

  const handleAddCard = (tabId: string) => {
    const newCard: CardData = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'Input name of card',
      videoUrl1: '',
      videoUrl2: '',
      description: 'Input description',
      tags: [],
    };
    setConfig(prev => ({
      ...prev,
      tabs: prev.tabs.map(t => t.id === tabId ? { ...t, cards: [...t.cards, newCard] } : t)
    }));
  };

  const handleUpdateCard = (tabId: string, cardId: string, updates: Partial<CardData>) => {
    setConfig(prev => ({
      ...prev,
      tabs: prev.tabs.map(t => {
        if (t.id !== tabId) return t;
        return {
          ...t,
          cards: t.cards.map(c => c.id === cardId ? { ...c, ...updates } : c)
        };
      })
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublishSubmit = async (email: string, existingUrl: string) => {
    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, existingUrl, config })
      });
      const data = await response.json();
      if (data.success) {
        alert(`Request sent successfully! Your Site ID is: ${data.siteId}`);
      } else {
        alert('Failed to send request. Check console.');
      }
    } catch (e) {
      console.error('Publish error:', e);
      alert('An error occurred while publishing.');
    }
    setIsPublishOpen(false);
  };

  // --- Render Helpers ---
  const activeTab = config.tabs.find(t => t.id === activeTabId);
  
  const allTags = activeTab?.type === 'video' 
    ? Array.from(new Set(activeTab.cards.flatMap(c => c.tags)))
    : [];

  const filteredCards = activeTab?.type === 'video'
    ? activeTab.cards.filter(c => !activeTagFilter || c.tags.includes(activeTagFilter))
    : [];

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ backgroundColor: config.theme.backgroundColor, color: config.theme.textColor }}>
      {/* 1. Fake Browser Header */}
      <FakeBrowser 
        title={config.browserTitle}
        favicon={config.favicon}
        onTitleChange={(t) => setConfig(prev => ({ ...prev, browserTitle: t }))}
        onFaviconChange={(f) => setConfig(prev => ({ ...prev, favicon: f }))}
      />

      {/* Top Action Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center sticky top-0 z-10 shadow-sm text-gray-800">
        <div className="flex gap-2">
          <button 
            onClick={() => handleAddTab('video')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Tab
          </button>
          <button 
            onClick={() => handleAddTab('about')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" /> Add About Tab
          </button>
          <button 
            onClick={() => setShowThemeSettings(!showThemeSettings)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showThemeSettings ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
          >
            <Palette className="w-4 h-4" /> Theme
          </button>
        </div>
        <button 
          onClick={() => setIsPublishOpen(true)}
          className="bg-[#10b981] hover:bg-[#059669] text-white px-6 py-2 rounded-full font-bold shadow-md shadow-emerald-500/30 transition-all hover:scale-105"
        >
          Publish
        </button>
      </div>

      {/* Theme Settings Panel */}
      {showThemeSettings && (
        <div className="bg-white border-b border-gray-200 p-4 flex gap-6 items-center justify-center text-sm shadow-inner text-gray-800">
          <div className="flex items-center gap-2">
            <label className="font-medium">Primary Color:</label>
            <input type="color" value={config.theme.primaryColor} onChange={(e) => setConfig(prev => ({ ...prev, theme: { ...prev.theme, primaryColor: e.target.value } }))} className="w-8 h-8 rounded cursor-pointer" />
          </div>
          <div className="flex items-center gap-2">
            <label className="font-medium">Background:</label>
            <input type="color" value={config.theme.backgroundColor} onChange={(e) => setConfig(prev => ({ ...prev, theme: { ...prev.theme, backgroundColor: e.target.value } }))} className="w-8 h-8 rounded cursor-pointer" />
          </div>
          <div className="flex items-center gap-2">
            <label className="font-medium">Card Color:</label>
            <input type="color" value={config.theme.cardColor} onChange={(e) => setConfig(prev => ({ ...prev, theme: { ...prev.theme, cardColor: e.target.value } }))} className="w-8 h-8 rounded cursor-pointer" />
          </div>
          <div className="flex items-center gap-2">
            <label className="font-medium">Text Color:</label>
            <input type="color" value={config.theme.textColor} onChange={(e) => setConfig(prev => ({ ...prev, theme: { ...prev.theme, textColor: e.target.value } }))} className="w-8 h-8 rounded cursor-pointer" />
          </div>
        </div>
      )}

      {/* 2. Hero Section */}
      <div 
        className="w-full py-20 px-6 flex flex-col items-center justify-center text-center relative group transition-all"
        style={{ 
          backgroundColor: config.heroImage ? 'transparent' : config.theme.primaryColor,
          backgroundImage: config.heroImage ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${config.heroImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#ffffff'
        }}
      >
        {/* Background Image Upload Button */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => heroImageInputRef.current?.click()}
            className="bg-white/20 hover:bg-white/40 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <ImageIcon className="w-4 h-4" /> {config.heroImage ? 'Change Background' : 'Add Background'}
          </button>
          {config.heroImage && (
            <button 
              onClick={() => setConfig(prev => ({ ...prev, heroImage: '' }))}
              className="ml-2 bg-red-500/80 hover:bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <input 
            type="file" 
            ref={heroImageInputRef} 
            onChange={(e) => handleImageUpload(e, (base64) => setConfig(prev => ({ ...prev, heroImage: base64 })))} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        <input
          type="text"
          value={config.heroTitle}
          onChange={(e) => setConfig(prev => ({ ...prev, heroTitle: e.target.value }))}
          className="text-5xl md:text-6xl font-black text-center bg-transparent border-none outline-none w-full hover:bg-white/10 focus:bg-white/20 rounded-lg transition-all py-2 placeholder-white/50"
          placeholder="Enter Title"
        />
        <textarea
          value={config.heroDescription}
          onChange={(e) => setConfig(prev => ({ ...prev, heroDescription: e.target.value }))}
          className="mt-4 text-xl text-center bg-transparent border-none outline-none w-full max-w-2xl mx-auto resize-none hover:bg-white/10 focus:bg-white/20 rounded-lg transition-all py-2 placeholder-white/50 opacity-90"
          rows={2}
          placeholder="Enter description"
        />
      </div>

      <div className="max-w-6xl mx-auto w-full p-8 flex-1">
        {/* 3. Tabs Navigation */}
        {config.tabs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 pb-4">
            {config.tabs.map(tab => (
              <div 
                key={tab.id}
                className={`flex items-center gap-2 px-6 py-3 rounded-t-xl border-b-2 transition-all font-semibold`}
                style={{
                  borderColor: activeTabId === tab.id ? config.theme.primaryColor : 'transparent',
                  backgroundColor: activeTabId === tab.id ? config.theme.cardColor : 'transparent',
                  color: activeTabId === tab.id ? config.theme.primaryColor : 'inherit',
                  opacity: activeTabId === tab.id ? 1 : 0.7
                }}
                onClick={() => setActiveTabId(tab.id)}
              >
                <DynamicIcon name={tab.iconName} className="w-5 h-5" />
                <input
                  type="text"
                  value={tab.name}
                  onChange={(e) => handleUpdateTabName(tab.id, e.target.value)}
                  onBlur={(e) => handleTabNameBlur(tab.id, e.target.value)}
                  className="bg-transparent border-none outline-none w-24 focus:w-auto min-w-[80px]"
                  onClick={(e) => {
                    if (activeTabId !== tab.id) e.preventDefault();
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* 4. Active Tab Content */}
        {activeTab && (
          <div 
            className="rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[400px]"
            style={{ backgroundColor: config.theme.cardColor }}
          >
            
            {/* ABOUT TAB */}
            {activeTab.type === 'about' && (
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="w-full md:w-1/3 flex flex-col gap-4">
                  {activeTab.aboutImage ? (
                    <div className="relative group">
                      <img src={activeTab.aboutImage} alt="About" className="w-full rounded-xl shadow-md object-cover" />
                      <button 
                        onClick={() => setConfig(prev => ({ ...prev, tabs: prev.tabs.map(t => t.id === activeTab.id ? { ...t, aboutImage: '' } : t) }))}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:text-emerald-500 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer">
                      <ImageIcon className="w-8 h-8 mb-2" />
                      <span className="text-sm font-medium">Upload Image</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, (base64) => {
                          setConfig(prev => ({ ...prev, tabs: prev.tabs.map(t => t.id === activeTab.id ? { ...t, aboutImage: base64 } : t) }));
                        })}
                      />
                    </label>
                  )}
                </div>
                <textarea
                  value={activeTab.aboutText}
                  onChange={(e) => {
                    setConfig(prev => ({
                      ...prev,
                      tabs: prev.tabs.map(t => t.id === activeTab.id ? { ...t, aboutText: e.target.value } : t)
                    }));
                  }}
                  className="flex-1 w-full h-64 p-4 bg-black/5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 resize-y text-lg leading-relaxed"
                  placeholder="Write about your dojo here..."
                  style={{ color: config.theme.textColor }}
                />
              </div>
            )}

            {/* VIDEO TAB */}
            {activeTab.type === 'video' && (
              <>
                {/* Tag Filter Bar */}
                {allTags.length > 0 && (
                  <div className="flex items-center gap-3 mb-8 p-3 bg-black/5 rounded-xl overflow-x-auto">
                    <Search className="w-4 h-4 opacity-50 flex-shrink-0" />
                    <button
                      onClick={() => setActiveTagFilter(null)}
                      className="px-4 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors font-medium"
                      style={{
                        backgroundColor: !activeTagFilter ? config.theme.primaryColor : 'transparent',
                        color: !activeTagFilter ? '#fff' : 'inherit'
                      }}
                    >
                      All
                    </button>
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setActiveTagFilter(tag)}
                        className="px-4 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors border font-medium"
                        style={{
                          backgroundColor: activeTagFilter === tag ? config.theme.primaryColor : config.theme.cardColor,
                          color: activeTagFilter === tag ? '#fff' : 'inherit',
                          borderColor: activeTagFilter === tag ? config.theme.primaryColor : 'rgba(0,0,0,0.1)'
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredCards.map(card => (
                    <div key={card.id} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all" style={{ backgroundColor: config.theme.cardColor }}>
                      {/* Card Header */}
                      <div className="p-5 border-b border-gray-100 bg-black/5">
                        <input
                          type="text"
                          value={card.title}
                          onChange={(e) => handleUpdateCard(activeTab.id, card.id, { title: e.target.value })}
                          className="font-bold text-xl bg-transparent border-none outline-none w-full focus:ring-2 focus:ring-emerald-500 rounded px-1"
                          placeholder="Input name of card"
                          style={{ color: config.theme.textColor }}
                        />
                      </div>
                      
                      {/* Card Body */}
                      <div className="p-5 space-y-4">
                        {/* Videos */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 bg-black/5 rounded-lg p-2 border border-gray-200">
                            <Video className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <input
                              type="text"
                              value={card.videoUrl1}
                              onChange={(e) => handleUpdateCard(activeTab.id, card.id, { videoUrl1: e.target.value })}
                              placeholder="Paste YouTube link here"
                              className="bg-transparent border-none outline-none text-sm w-full"
                              style={{ color: config.theme.textColor }}
                            />
                          </div>
                          
                          {card.videoUrl2 !== undefined ? (
                            <div className="flex items-center gap-2 bg-black/5 rounded-lg p-2 border border-gray-200">
                              <Video className="w-4 h-4 text-red-500 flex-shrink-0" />
                              <input
                                type="text"
                                value={card.videoUrl2}
                                onChange={(e) => handleUpdateCard(activeTab.id, card.id, { videoUrl2: e.target.value })}
                                placeholder="Second YouTube link"
                                className="bg-transparent border-none outline-none text-sm w-full"
                                style={{ color: config.theme.textColor }}
                              />
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleUpdateCard(activeTab.id, card.id, { videoUrl2: '' })}
                              className="text-xs font-medium flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
                              style={{ color: config.theme.primaryColor }}
                            >
                              <Plus className="w-3 h-3" /> Add second video
                            </button>
                          )}
                        </div>

                        {/* Description */}
                        <textarea
                          value={card.description}
                          onChange={(e) => handleUpdateCard(activeTab.id, card.id, { description: e.target.value })}
                          placeholder="Input description"
                          className="w-full text-sm bg-black/5 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-24"
                          style={{ color: config.theme.textColor }}
                        />

                        {/* Tags Input */}
                        <div className="border-t border-gray-100 pt-4 space-y-3">
                          {/* Existing Tags */}
                          {card.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {card.tags.map(tag => (
                                <span key={tag} className="flex items-center gap-1 text-xs px-2 py-1 bg-black/5 rounded-md border border-gray-200">
                                  #{tag}
                                  <button
                                    onClick={() => handleUpdateCard(activeTab.id, card.id, { tags: card.tags.filter(t => t !== tag) })}
                                    className="hover:text-red-500 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Add New Tag */}
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 opacity-50" />
                            <input
                              type="text"
                              placeholder="Type a tag and press Enter..."
                              className="bg-transparent border-none outline-none text-xs w-full opacity-70 focus:opacity-100"
                              style={{ color: config.theme.textColor }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const newTag = e.currentTarget.value.trim();
                                  if (newTag && !card.tags.includes(newTag)) {
                                    handleUpdateCard(activeTab.id, card.id, { tags: [...card.tags, newTag] });
                                    e.currentTarget.value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              onClick={(e) => {
                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                const newTag = input.value.trim();
                                if (newTag && !card.tags.includes(newTag)) {
                                  handleUpdateCard(activeTab.id, card.id, { tags: [...card.tags, newTag] });
                                  input.value = '';
                                }
                              }}
                              className="text-xs bg-black/5 hover:bg-black/10 px-2 py-1 rounded font-medium transition-colors whitespace-nowrap"
                              style={{ color: config.theme.textColor }}
                            >
                              Add Tag
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Card Button */}
                  {(!activeTagFilter) && (
                    <button
                      onClick={() => handleAddCard(activeTab.id)}
                      className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center hover:bg-black/5 transition-all min-h-[300px] gap-2"
                      style={{ color: config.theme.primaryColor }}
                    >
                      <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center">
                        <Plus className="w-6 h-6" />
                      </div>
                      <span className="font-medium">Add Video Card</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Empty State */}
        {config.tabs.length === 0 && (
          <div className="text-center py-20">
            <LayoutTemplate className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-600">Start building your dojo portal</h3>
            <p className="text-gray-400 mt-2">Click "Add Tab" above to create your first section.</p>
          </div>
        )}
      </div>

      {/* Publish Sidebar */}
      <PublishSidebar 
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        onSubmit={handlePublishSubmit}
      />
    </div>
  );
}
