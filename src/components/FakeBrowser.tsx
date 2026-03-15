import React, { useRef } from 'react';
import { Upload, Globe } from 'lucide-react';

interface FakeBrowserProps {
  title: string;
  favicon: string;
  onTitleChange: (title: string) => void;
  onFaviconChange: (faviconBase64: string) => void;
}

export function FakeBrowser({ title, favicon, onTitleChange, onFaviconChange }: FakeBrowserProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onFaviconChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full bg-[#dee1e6] flex items-end px-2 pt-2 border-b border-gray-300 select-none">
      <div className="flex items-center bg-white rounded-t-lg px-3 py-2 min-w-[240px] max-w-[300px] border-t border-x border-gray-200 relative group">
        
        {/* Favicon Upload */}
        <div 
          className="relative w-5 h-5 mr-2 cursor-pointer flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
        >
          {favicon ? (
            <img src={favicon} alt="favicon" className="w-full h-full object-cover rounded-sm" />
          ) : (
            <Globe className="w-5 h-5 text-gray-500" />
          )}
          <div className="absolute inset-0 bg-black/50 rounded-sm opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Upload className="w-3 h-3 text-white" />
          </div>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />

        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="New Tab"
          className="bg-transparent border-none outline-none text-sm text-gray-800 w-full placeholder-gray-400"
        />
      </div>
    </div>
  );
}
