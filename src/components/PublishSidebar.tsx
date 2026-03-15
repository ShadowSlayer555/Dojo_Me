import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send } from 'lucide-react';

interface PublishSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (existingUrl: string) => void;
}

export function PublishSidebar({ isOpen, onClose, onSubmit }: PublishSidebarProps) {
  const [existingUrl, setExistingUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(existingUrl);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-800">Publish Website</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex flex-col items-center mb-8 text-center">
                <div className="w-24 h-24 bg-slate-900 rounded-full mb-4 overflow-hidden border-4 border-slate-800 flex items-center justify-center">
                  <img src="https://raw.githubusercontent.com/ShadowSlayer555/Dojo_Me/449a410e72b5357de146ba8c851d3e697bad01eb/Umbra%20Atelier%20Logo.png" alt="Umbra Atelier" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Umbra Atelier</h3>
                <p className="text-sm text-emerald-600 font-medium mt-1">We should respond by email as soon as possible!</p>
              </div>

              <p className="text-sm text-gray-600 mb-8 text-center">
                Request a website from the Umbra Atelier team. We will generate the repository and send you a link to publish it via GitHub Pages.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Not your first time? Edit an existing website:
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Paste the link to your existing GitHub repository or website URL to update it.</p>
                  <input
                    type="url"
                    value={existingUrl}
                    onChange={(e) => setExistingUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>

                <div className="pt-8">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-sm shadow-emerald-500/20"
                  >
                    <Send className="w-4 h-4" />
                    Send Request
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
