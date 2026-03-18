import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Search, Github, Box, Cpu, ArrowUpRight, Star, X } from 'lucide-react';
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

function Home({ adapters, loading }: { adapters: Adapter[]; loading: boolean }) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filtered = adapters.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.description.toLowerCase().includes(search.toLowerCase()) ||
    a.hardware_tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const featuredAdapters = adapters.filter(a => a.featured);
  const allTags = [...new Set(adapters.flatMap(a => a.hardware_tags))];

  return (
    <>
      <div className="pt-20" />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pb-6">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -top-20 left-1/3 w-[600px] h-[400px] rounded-full bg-oahl-accent/5 blur-[100px]" />
        <div className="pointer-events-none absolute top-10 right-0 w-[400px] h-[300px] rounded-full bg-oahl-tech/4 blur-[80px]" />

        <div className="max-w-5xl mx-auto px-6 pt-20 pb-14 relative z-10">
          <div className="max-w-xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-oahl-accent/20 bg-oahl-accent/8 text-oahl-accent text-[11px] font-mono mb-7 tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-oahl-accent animate-pulse-soft" />
              Open Adapter Registry
            </div>

            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-5 leading-[1.1]">
              <span className="text-oahl-textMain">Hardware adapters</span>
              <br />
              <span className="text-gradient">for AI agents.</span>
            </h1>

            <p className="text-oahl-textMuted text-base leading-relaxed mb-8 max-w-sm mx-auto">
              Community-maintained plugins that bridge physical devices to the OAHL protocol.
            </p>

            {/* Stats row */}
            {!loading && (
              <div className="flex items-center justify-center gap-6 text-xs font-mono mb-10">
                <span className="text-oahl-textMuted">
                  <span className="text-oahl-textMain font-semibold text-sm">{adapters.length}</span> adapters
                </span>
                <span className="w-px h-3 bg-oahl-border" />
                <span className="text-oahl-textMuted">
                  <span className="text-oahl-textMain font-semibold text-sm">{allTags.length}</span> hardware types
                </span>
                <span className="w-px h-3 bg-oahl-border" />
                <span className="text-oahl-tech font-medium">All MIT licensed</span>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto">
            <div className="search-wrap relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-oahl-textMuted pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                className="block w-full pl-11 pr-16 py-3.5 bg-transparent text-oahl-textMain placeholder-oahl-textMuted focus:outline-none font-mono text-sm"
                placeholder="Search adapters, hardware, capabilities…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search ? (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-oahl-textMuted hover:text-oahl-textMain transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 font-mono text-[10px] text-oahl-textFaint pointer-events-none">
                  <kbd className="px-1 py-0.5 rounded border border-oahl-border">⌘</kbd>
                  <kbd className="px-1 py-0.5 rounded border border-oahl-border">K</kbd>
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Marquee ── */}
      {!loading && featuredAdapters.length > 0 && (
        <section className="mb-14 relative">
          {/* Section header */}
          <div className="flex items-center gap-3 mb-7 px-6 max-w-5xl mx-auto">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-oahl-border" />
            <div className="flex items-center gap-2 shrink-0">
              <Star className="w-3.5 h-3.5 text-oahl-accent" fill="currentColor" />
              <span className="font-mono text-[10px] text-oahl-textMuted uppercase tracking-[0.18em]">Featured</span>
              <Star className="w-3.5 h-3.5 text-oahl-accent" fill="currentColor" />
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-oahl-border" />
          </div>

          {/* Fade masks */}
          <div className="pointer-events-none absolute left-0 top-12 bottom-0 w-28 bg-gradient-to-r from-oahl-bg to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-12 bottom-0 w-28 bg-gradient-to-l from-oahl-bg to-transparent z-10" />

          <div className="overflow-hidden">
            <div className="flex gap-4 animate-marquee w-max hover:[animation-play-state:paused]">
              {[...featuredAdapters, ...featuredAdapters, ...featuredAdapters, ...featuredAdapters].map((adapter, idx) => (
                <Link
                  key={`${adapter.id}-${idx}`}
                  to={`/adapter/${adapter.id}`}
                  className="featured-card w-72 flex-shrink-0 p-5 flex flex-col group"
                >
                  <div className="flex items-start justify-between mb-2.5">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-oahl-textMain group-hover:text-oahl-accent transition-colors truncate leading-snug">
                        {adapter.name}
                      </h3>
                      <p className="text-[10px] font-mono text-oahl-textMuted mt-0.5 truncate">@{adapter.author}</p>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-oahl-textMuted opacity-0 group-hover:opacity-100 transition-all group-hover:text-oahl-accent shrink-0 ml-2 mt-0.5" />
                  </div>

                  <p className="text-oahl-textMuted text-xs leading-relaxed line-clamp-2 flex-grow mb-4">
                    {adapter.description}
                  </p>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {adapter.hardware_tags.slice(0, 2).map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.07] font-mono text-[10px] text-oahl-textMuted">
                        #{tag}
                      </span>
                    ))}
                    {adapter.version && (
                      <span className="ml-auto font-mono text-[10px] text-oahl-textFaint">v{adapter.version}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Registry Grid ── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        {search && (
          <p className="text-xs font-mono text-oahl-textMuted mb-5">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for{' '}
            <span className="text-oahl-accent">"{search}"</span>
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="adapter-card-skeleton h-56 rounded-[20px]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-oahl-border/60 bg-oahl-surface/20">
            <p className="font-mono text-sm text-oahl-textMuted mb-3">
              Nothing matched <span className="text-oahl-accent">"{search}"</span>
            </p>
            <button
              onClick={() => setSearch('')}
              className="text-xs font-mono text-oahl-tech hover:text-oahl-accent transition-colors"
            >
              Clear search →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(adapter => (
              <Link
                key={adapter.id}
                to={`/adapter/${adapter.id}`}
                className="adapter-card group flex flex-col p-5"
              >
                {/* Card header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-oahl-accent/10 border border-oahl-accent/15 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-oahl-accent/15 transition-colors">
                    <Box className="w-4 h-4 text-oahl-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-sm text-oahl-textMain group-hover:text-oahl-accent transition-colors truncate flex-1 leading-snug">
                        {adapter.name}
                      </h3>
                      {adapter.featured && (
                        <Star className="w-3 h-3 text-oahl-accent shrink-0" fill="currentColor" />
                      )}
                    </div>
                    <p className="font-mono text-[10px] text-oahl-textMuted">
                      @{adapter.author}
                      {adapter.version && <span className="text-oahl-textFaint"> · v{adapter.version}</span>}
                    </p>
                  </div>
                </div>

                <p className="text-oahl-textMuted text-xs leading-relaxed mb-4 flex-grow line-clamp-3">
                  {adapter.description}
                </p>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {adapter.capabilities.slice(0, 3).map(cap => (
                    <span
                      key={cap}
                      className="font-mono text-[10px] text-oahl-tech bg-oahl-techDim border border-oahl-tech/12 px-2 py-0.5 rounded-md"
                    >
                      {cap}
                    </span>
                  ))}
                  {adapter.capabilities.length > 3 && (
                    <span className="font-mono text-[10px] text-oahl-textMuted px-2 py-0.5 rounded-md border border-oahl-border/50">
                      +{adapter.capabilities.length - 3}
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-oahl-border/40">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {adapter.hardware_tags.slice(0, 2).map(tag => (
                      <span
                        key={tag}
                        className="font-mono text-[10px] text-oahl-textMuted bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                    {adapter.hardware_tags.length > 2 && (
                      <span className="font-mono text-[10px] text-oahl-textFaint">
                        +{adapter.hardware_tags.length - 2}
                      </span>
                    )}
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-oahl-textMuted opacity-0 group-hover:opacity-100 group-hover:text-oahl-accent transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default function App() {
  const [adapters, setAdapters] = useState<Adapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const remoteRegistryUrl = 'https://raw.githubusercontent.com/fredabila/oahl/main/registry/registry.json';

    fetch(remoteRegistryUrl)
      .then(res => {
        if (!res.ok) throw new Error('Remote registry unavailable');
        return res.json();
      })
      .then(data => { setAdapters(data); setLoading(false); })
      .catch(() => {
        fetch('/registry.json')
          .then(res => res.json())
          .then(data => { setAdapters(data); setLoading(false); })
          .catch(() => setLoading(false));
      });
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-oahl-bg text-oahl-textMain font-sans selection:bg-oahl-accent/15 selection:text-oahl-accent relative">

        {/* ── Floating Header ── */}
        <header className="fixed top-3 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-4xl z-50">
          <div className="bg-oahl-surface/75 backdrop-blur-xl border border-oahl-border/50 shadow-2xl shadow-black/40 rounded-2xl px-5 py-2.5 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-lg bg-oahl-accent/12 border border-oahl-accent/20 flex items-center justify-center shrink-0">
                <Cpu className="w-3.5 h-3.5 text-oahl-accent" />
              </div>
              <span className="text-sm font-semibold tracking-tight">OAHL Registry</span>
            </Link>

            <a
              href="https://github.com/fredabila/oahl/tree/main/registry"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-oahl-textMuted hover:text-oahl-textMain transition-all text-xs font-mono bg-oahl-bg/60 px-3.5 py-1.5 rounded-xl border border-oahl-border/40 hover:border-oahl-tech/35 hover:text-oahl-tech"
            >
              <Github className="w-3.5 h-3.5" />
              Submit adapter
            </a>
          </div>
        </header>

        <Routes>
          <Route path="/"            element={<Home adapters={adapters} loading={loading} />} />
          <Route path="/adapter/:id" element={<AdapterDetail adapters={adapters} />} />
        </Routes>

        {/* ── Footer ── */}
        <footer className="border-t border-oahl-border/40 py-10">
          <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-oahl-accent/10 border border-oahl-accent/18 flex items-center justify-center">
                <Cpu className="w-3 h-3 text-oahl-accent" />
              </div>
              <span className="font-mono text-xs text-oahl-textMuted">
                OAHL Adapter Registry · Open Source
              </span>
            </div>
            <div className="flex items-center gap-5 font-mono text-xs text-oahl-textMuted">
              <a href="https://oahl.org"                       className="hover:text-oahl-textMain transition-colors">oahl.org</a>
              <a href="https://github.com/fredabila/oahl"      className="hover:text-oahl-textMain transition-colors">GitHub</a>
              <a href="https://oahl.dev"                       className="hover:text-oahl-textMain transition-colors">Platform</a>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
