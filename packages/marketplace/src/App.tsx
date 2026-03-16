import React, { useState, useEffect } from 'react';
import { Search, Github, Box, Shield, Cpu, Package, ArrowUpRight, Star } from 'lucide-react';

interface Adapter {
  id: string;
  name: string;
  description: string;
  author: string;
  repository: string;
  npm_package?: string;
  hardware_tags: string[];
  capabilities: string[];
  license: string;
  featured?: boolean;
}

export default function App() {
  const [adapters, setAdapters] = useState<Adapter[]>([]);
  const [search, setSearch] = useState('');
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

  const filtered = adapters.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.description.toLowerCase().includes(search.toLowerCase()) ||
    a.hardware_tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const featuredAdapters = adapters.filter(a => a.featured);

  return (
    <div className="min-h-screen bg-oahl-bg text-oahl-textMain font-sans selection:bg-oahl-tech selection:text-oahl-bg">
      {/* Header */}
      <header className="border-b border-oahl-border bg-oahl-bg/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Cpu className="text-oahl-accent w-6 h-6" />
            <div>
              <h1 className="text-xl font-medium tracking-tight">OAHL Registry</h1>
            </div>
          </div>
          <a 
            href="https://github.com/fredabila/oahl/tree/main/registry" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-oahl-textMuted hover:text-oahl-textMain transition-colors text-sm font-mono"
          >
            <Github size={16} />
            [submit_adapter]
          </a>
        </div>
      </header>

      {/* Featured Marquee */}
      {!loading && featuredAdapters.length > 0 && (
        <div className="border-b border-oahl-border bg-oahl-surface overflow-hidden py-3">
          <div className="flex items-center gap-4 animate-marquee whitespace-nowrap">
            {/* Render list twice for continuous loop */}
            {[...featuredAdapters, ...featuredAdapters, ...featuredAdapters].map((adapter, idx) => (
              <div key={`${adapter.id}-${idx}`} className="flex items-center gap-3 px-8 border-r border-oahl-border last:border-r-0">
                <Star size={14} className="text-oahl-accent" fill="currentColor" />
                <span className="font-mono text-sm text-oahl-textMain">FEATURED: {adapter.name}</span>
                <span className="text-xs text-oahl-textMuted max-w-[200px] truncate">{adapter.description}</span>
                <a 
                  href={adapter.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-oahl-tech hover:underline font-mono"
                >
                  view_source
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="max-w-3xl mb-16">
          <h2 className="text-4xl md:text-5xl font-semibold mb-6 tracking-tight">
            Standardized Hardware Interfaces
          </h2>
          <p className="text-lg text-oahl-textMuted leading-relaxed">
            Discover community-maintained adapters that bridge physical devices to the Open Agent Hardware Layer. Install these plugins to your local node to expose capabilities to AI agents.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-16 group">
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
              <div key={adapter.id} className="bg-oahl-surface border border-oahl-border hover:border-oahl-tech/50 transition-colors p-6 flex flex-col group relative">
                
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-medium tracking-tight group-hover:text-oahl-accent transition-colors flex items-center gap-2">
                    {adapter.featured && <Star size={16} className="text-oahl-accent" fill="currentColor" title="Featured Adapter" />}
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
                      {adapter.capabilities.map(cap => (
                        <li key={cap} className="font-mono text-xs text-oahl-textMain flex items-center gap-2">
                          <span className="w-1 h-1 bg-oahl-tech/50 inline-block"></span>
                          {cap}
                        </li>
                      ))}
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
                    <div className="flex items-center gap-3">
                      <a 
                        href={adapter.repository} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-oahl-textMuted hover:text-oahl-textMain transition-colors flex items-center gap-1"
                        title="Source Code"
                      >
                        <Github size={18} />
                      </a>
                      {adapter.npm_package && (
                        <a 
                          href={`https://www.npmjs.com/package/${adapter.npm_package}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-oahl-accent hover:text-oahl-accentHover transition-colors flex items-center gap-1"
                          title="NPM Package"
                        >
                          <Package size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-oahl-border bg-oahl-surface">
            <span className="font-mono text-oahl-textMuted">0 results found for '{search}'</span>
          </div>
        )}
      </main>

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
  );
}

