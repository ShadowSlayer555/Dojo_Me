const { useState, useEffect } = React;

function App() {
  const [config, setConfig] = useState(null);
  const [activeTabId, setActiveTabId] = useState(null);
  const [activeTagFilter, setActiveTagFilter] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch the configuration from data.json
    fetch('./data.json')
      .then(response => {
        if (!response.ok) throw new Error("Failed to load data.json");
        return response.json();
      })
      .then(data => {
        setConfig(data);
        if (data.tabs && data.tabs.length > 0) {
          setActiveTabId(data.tabs[0].id);
        }
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
      });
  }, []);

  useEffect(() => {
    if (!config) return;
    // Update document title and favicon
    if (config.browserTitle) document.title = config.browserTitle;
    if (config.favicon) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = config.favicon;
    }
    // Initialize Lucide icons
    lucide.createIcons();
  }, [config]);

  useEffect(() => {
    if (config) {
      lucide.createIcons();
    }
  }, [activeTabId, activeTagFilter, config]);

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}. Please ensure data.json is formatted correctly.</div>;
  }

  if (!config) {
    return <div className="p-8 text-gray-500">Loading website data...</div>;
  }

  const activeTab = config.tabs.find(t => t.id === activeTabId);
  
  const allTags = activeTab?.type === 'video' 
    ? Array.from(new Set(activeTab.cards.flatMap(c => c.tags || [])))
    : [];

  const filteredCards = activeTab?.type === 'video'
    ? activeTab.cards.filter(c => !activeTagFilter || (c.tags && c.tags.includes(activeTagFilter)))
    : [];

  // Apply theme styles
  const appStyle = {
    backgroundColor: config.theme.backgroundColor,
    color: config.theme.textColor,
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  };

  const getEmbedUrl = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  return (
    <div style={appStyle} className="flex flex-col">
      {/* Hero Section */}
      <div 
        className="w-full py-20 px-6 flex flex-col items-center justify-center text-center relative"
        style={{ 
          backgroundColor: config.heroImage ? 'transparent' : config.theme.primaryColor,
          backgroundImage: config.heroImage ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${config.heroImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#ffffff'
        }}
      >
        <h1 className="text-5xl md:text-6xl font-black mb-4">{config.heroTitle}</h1>
        <p className="text-xl max-w-2xl opacity-90">{config.heroDescription}</p>
      </div>

      <div className="max-w-6xl mx-auto w-full p-8 flex-1">
        {/* Tabs Navigation */}
        {config.tabs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 pb-4">
            {config.tabs.map(tab => (
              <button 
                key={tab.id}
                className={`flex items-center gap-2 px-6 py-3 rounded-t-xl border-b-2 transition-all font-semibold`}
                style={{
                  borderColor: activeTabId === tab.id ? config.theme.primaryColor : 'transparent',
                  backgroundColor: activeTabId === tab.id ? config.theme.cardColor : 'transparent',
                  color: activeTabId === tab.id ? config.theme.primaryColor : 'inherit',
                  opacity: activeTabId === tab.id ? 1 : 0.7
                }}
                onClick={() => {
                  setActiveTabId(tab.id);
                  setActiveTagFilter(null);
                }}
              >
                <i data-lucide={tab.iconName.toLowerCase()} className="w-5 h-5"></i>
                {tab.name}
              </button>
            ))}
          </div>
        )}

        {/* Active Tab Content */}
        {activeTab && (
          <div 
            className="rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[400px]"
            style={{ backgroundColor: config.theme.cardColor }}
          >
            
            {/* ABOUT TAB */}
            {activeTab.type === 'about' && (
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {activeTab.aboutImage && (
                  <img src={activeTab.aboutImage} alt="About" className="w-full md:w-1/3 rounded-xl shadow-md object-cover" />
                )}
                <div className="flex-1 whitespace-pre-wrap text-lg leading-relaxed">
                  {activeTab.aboutText}
                </div>
              </div>
            )}

            {/* VIDEO TAB */}
            {activeTab.type === 'video' && (
              <>
                {/* Tag Filter Bar */}
                {allTags.length > 0 && (
                  <div className="flex items-center gap-3 mb-8 p-3 bg-black/5 rounded-xl overflow-x-auto">
                    <i data-lucide="search" className="w-4 h-4 opacity-50 flex-shrink-0"></i>
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
                      <div className="p-5 border-b border-gray-100 bg-black/5">
                        <h3 className="font-bold text-xl">{card.title}</h3>
                      </div>
                      
                      <div className="p-5 space-y-4">
                        {/* Videos */}
                        {getEmbedUrl(card.videoUrl1) && (
                          <div className="aspect-video rounded-lg overflow-hidden bg-black">
                            <iframe width="100%" height="100%" src={getEmbedUrl(card.videoUrl1)} frameBorder="0" allowFullScreen></iframe>
                          </div>
                        )}
                        {getEmbedUrl(card.videoUrl2) && (
                          <div className="aspect-video rounded-lg overflow-hidden bg-black mt-4">
                            <iframe width="100%" height="100%" src={getEmbedUrl(card.videoUrl2)} frameBorder="0" allowFullScreen></iframe>
                          </div>
                        )}

                        <p className="text-sm opacity-80 whitespace-pre-wrap pt-2">{card.description}</p>

                        {card.tags && card.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                            {card.tags.map(tag => (
                              <span key={tag} className="text-xs px-2 py-1 bg-black/5 rounded-md opacity-70">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
