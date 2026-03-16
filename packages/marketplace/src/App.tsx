import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Search, Github, Box, Shield, Cpu, Package, ArrowUpRight, Star } from 'lucide-react';
import AdapterDetail from './AdapterDetail';

interface Adapter {
  id: string;
  name: string;
  description: string;
  author: string;
  repository: string;
  npm_package?: string;
  version?: string;
  hardware_tags: string[];
  capabilities: string[];
  license: string;
  featured?: boolean;
  readme_url?: string;
}

function Home({ adapters, loading }: { adapters: Adapter[], loading: boolean }) {
  const [search, setSearch] = useState('');

  const filtered = adapters.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.description.toLowerCase().includes(search.toLowerCase()) ||
    a.hardware_tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const featuredAdapters = adapters.filter(a => a.featured);

  return (
    <>
      {/* Padding to account for fixed header */}
      <div className="pt-28"></div>

      <main className="max-w-7xl mx-auto px-6 py-16 overflow-hidden">
        {/* Hero */}
        <div className="max-w-3xl mb-16 mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-semibold mb-6 tracking-tight">
            Standardized Hardware Interfaces
          </h2>
          <p className="text-lg text-oahl-textMuted leading-relaxed">
            Discover community-maintained adapters that bridge physical devices to the Open Agent Hardware Layer. Install these plugins to your local node to expose capabilities to AI agents.
          </p>
        </div>

        {/* Featured Marquee Cards */}
        {!loading && featuredAdapters.length > 0 && (
          <div className="mb-24 relative">
            <div className="flex items-center gap-2 mb-6 justify-center">
              <Star size={16} className="text-oahl-accent" fill="currentColor" />
              <span className="font-mono text-sm text-oahl-textMain uppercase tracking-widest">Featured Adapters</span>
              <Star size={16} className="text-oahl-accent" fill="currentColor" />
            </div>
            
            {/* Fade Edges for Marquee */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-oahl-bg to-transparent z-10 mt-10 pointer-events-none"></div>
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-oahl-bg to-transparent z-10 mt-10 pointer-events-none"></div>

            <div className="overflow-hidden">
              <div className="flex gap-6 animate-marquee w-max hover:[animation-play-state:paused]">
                {/* Render list enough times to ensure screen width coverage */}
                {[...featuredAdapters, ...featuredAdapters, ...featuredAdapters, ...featuredAdapters].map((adapter, idx) => (
                  <Link 
                    key={`${adapter.id}-${idx}`} 
                    to={`/adapter/${adapter.id}`}
                    className="w-80 flex-shrink-0 bg-oahl-surface border border-oahl-border hover:border-oahl-accent/50 p-6 flex flex-col group transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-medium tracking-tight group-hover:text-oahl-accent transition-colors truncate">
                        {adapter.name}
                      </h3>
                      <ArrowUpRight size={16} className="text-oahl-textMuted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-sm text-oahl-textMuted line-clamp-2 mb-4 flex-grow">
                      {adapter.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-oahl-border/50">
                      <span className="font-mono text-xs text-oahl-tech px-2 py-1 bg-oahl-bg border border-oahl-border">
                        {adapter.hardware_tags[0] ? `#${adapter.hardware_tags[0]}` : 'adapter'}
                      </span>
                      <span className="font-mono text-[10px] text-oahl-textMuted">
                        @{adapter.author}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-12 max-w-4xl mx-auto group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-oahl-tech font-mono font-bold">{'>'}</span>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-4 py-4 bg-oahl-surface border-2 border-oahl-border text-oahl-textMain placeholder-oahl-textMuted focus:outline-none focus:border-oahl-tech transition-colors font-mono text-sm"
            placeholder="Search by hardware type, capability, or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="font-mono text-oahl-tech animate-pulse">Loading index...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(adapter => (
              <Link 
                to={`/adapter/${adapter.id}`}
                key={adapter.id} 
                className="bg-oahl-surface border border-oahl-border hover:border-oahl-tech/50 transition-colors p-6 flex flex-col group relative block"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-medium tracking-tight group-hover:text-oahl-accent transition-colors flex items-center gap-2">
                    {adapter.featured && <span title="Featured Adapter"><Star size={16} className="text-oahl-accent" fill="currentColor" /></span>}
                    {adapter.name}
                  </h3>
                  <span className="font-mono text-[10px] uppercase text-oahl-textMuted border border-oahl-border px-1.5 py-0.5 bg-oahl-bg">
                    {adapter.license}
                  </span>
                </div>
                
                <p className="text-oahl-textMuted text-sm leading-relaxed mb-8 flex-grow">
                  {adapter.description}
                </p>

                <div className="space-y-6">
                  {/* Capabilities */}
                  <div>
                    <div className="flex items-center gap-2 mb-3 border-b border-oahl-border pb-2">
                      <Shield size={14} className="text-oahl-tech" />
                      <span className="font-mono text-xs text-oahl-textMuted uppercase tracking-wider">Capabilities</span>
                    </div>
                    <ul className="space-y-1.5">
                      {adapter.capabilities.slice(0, 3).map(cap => (
                        <li key={cap} className="font-mono text-xs text-oahl-textMain flex items-center gap-2">
                          <span className="w-1 h-1 bg-oahl-tech/50 inline-block"></span>
                          {cap}
                        </li>
                      ))}
                      {adapter.capabilities.length > 3 && (
                        <li className="font-mono text-xs text-oahl-textMuted pl-3 italic">
                          + {adapter.capabilities.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {adapter.hardware_tags.map(tag => (
                      <span key={tag} className="font-mono text-[10px] text-oahl-textMuted bg-oahl-bg border border-oahl-border px-2 py-1">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-4 border-t border-oahl-border flex items-center justify-between">
                    <span className="font-mono text-xs text-oahl-textMuted">
                      by @{adapter.author}
                    </span>
                    <span className="text-oahl-tech group-hover:underline text-sm font-mono flex items-center gap-1">
                      Details <ArrowUpRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-oahl-border bg-oahl-surface">
            <span className="font-mono text-oahl-textMuted">0 results found for '{search}'</span>
          </div>
        )}
      </main>
    </>
  );
}

export default function App() {
  const [adapters, setAdapters] = useState<Adapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt to fetch from the live GitHub repository first
    const remoteRegistryUrl = 'https://raw.githubusercontent.com/fredabila/oahl/main/registry/registry.json';
    
    fetch(remoteRegistryUrl)
      .then(res => {
        if (!res.ok) throw new Error('Remote registry not found or inaccessible');
        return res.json();
      })
      .then(data => {
        setAdapters(data);
        setLoading(false);
      })
      .catch(err => {
        console.warn('Falling back to local registry.json due to error:', err);
        // Fallback to local dev file if remote is unavailable
        fetch('/registry.json')
          .then(res => res.json())
          .then(data => {
            setAdapters(data);
            setLoading(false);
          })
          .catch(localErr => {
            console.error('Failed to load local registry', localErr);
            setLoading(false);
          });
      });
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-oahl-bg text-oahl-textMain font-sans selection:bg-oahl-tech selection:text-oahl-bg relative">
        {/* Liquid Header */}
        <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl z-50 transition-all">
          <div className="bg-oahl-surface/60 backdrop-blur-xl border border-oahl-border/50 shadow-2xl shadow-oahl-bg/80 rounded-full px-6 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
              <Cpu className="text-oahl-accent w-5 h-5" />
              <div>
                <h1 className="text-lg font-medium tracking-tight">OAHL Registry</h1>
              </div>
            </Link>
            <a 
              href="https://github.com/fredabila/oahl/tree/main/registry" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-oahl-textMuted hover:text-oahl-textMain transition-colors text-sm font-mono bg-oahl-bg/50 px-4 py-1.5 rounded-full border border-oahl-border/30 hover:border-oahl-tech/50"
            >
              <Github size={14} />
              [submit_adapter]
            </a>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Home adapters={adapters} loading={loading} />} />
          <Route path="/adapter/:id" element={<AdapterDetail adapters={adapters} />} />
        </Routes>

        {/* Footer */}
        <footer className="border-t border-oahl-border mt-20 py-8 bg-oahl-bg">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs text-oahl-textMuted">
            <div className="flex items-center gap-2">
              <Cpu size={14} />
              <span>OAHL OPEN SOURCE</span>
            </div>
            <div className="flex gap-6">
              <a href="https://oahl.org/docs" className="hover:text-oahl-textMain transition-colors">docs</a>
              <a href="https://github.com/fredabila/oahl" className="hover:text-oahl-textMain transition-colors">repo</a>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

