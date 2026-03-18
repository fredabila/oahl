import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ArrowLeft, Github, Package, Copy, CheckCircle2, Terminal, X, Box, ExternalLink } from 'lucide-react';

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
  readme_url?: string;
}

export default function AdapterDetail({ adapters }: { adapters: Adapter[] }) {
  const { id } = useParams();
  const adapter = adapters.find(a => a.id === id);

  const [readme, setReadme] = useState('');
  const [loadingReadme, setLoadingReadme] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAllCaps, setShowAllCaps] = useState(false);

  useEffect(() => {
    if (!adapter) return;
    if (adapter.readme_url) {
      setLoadingReadme(true);
      fetch(adapter.readme_url)
        .then(r => r.text())
        .then(t => { setReadme(t); setLoadingReadme(false); })
        .catch(() => { setReadme('> No README found or failed to load.'); setLoadingReadme(false); });
    } else {
      setReadme('> No README provided for this adapter.');
    }
  }, [adapter]);

  if (!adapter) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-oahl-surface border border-oahl-border flex items-center justify-center mb-2">
          <Box className="w-7 h-7 text-oahl-textMuted" />
        </div>
        <h2 className="text-xl font-semibold text-oahl-textMain">Adapter not found</h2>
        <p className="text-sm text-oahl-textMuted">This adapter doesn't exist in the registry.</p>
        <Link to="/" className="mt-2 text-sm text-oahl-accent hover:underline font-mono">
          ← Back to registry
        </Link>
      </div>
    );
  }

  const copyInstall = () => {
    if (adapter.npm_package) {
      navigator.clipboard.writeText(`oahl install ${adapter.npm_package}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const VISIBLE_CAPS_LIMIT = 5;
  const hasMoreCaps = adapter.capabilities.length > VISIBLE_CAPS_LIMIT;

  return (
    <div className="min-h-screen">
      <div className="pt-24" />

      {/* ── Page header band ── */}
      <div className="border-b border-oahl-border/40 bg-oahl-surface/20 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-oahl-textMuted hover:text-oahl-textMain transition-colors font-mono text-xs mb-6 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Registry
          </Link>

          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-oahl-accent/10 border border-oahl-accent/18 flex items-center justify-center shrink-0 shadow-lg shadow-oahl-accent/5">
              <Box className="w-6 h-6 text-oahl-accent" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1.5">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-oahl-textMain">
                  {adapter.name}
                </h1>
                {adapter.version && (
                  <span className="font-mono text-xs text-oahl-tech border border-oahl-tech/25 bg-oahl-tech/8 px-2.5 py-0.5 rounded-full">
                    v{adapter.version}
                  </span>
                )}
                <span className="font-mono text-[10px] uppercase text-oahl-textMuted border border-oahl-border px-2 py-0.5 rounded-md">
                  {adapter.license}
                </span>
              </div>
              <p className="text-oahl-textMuted text-sm leading-relaxed max-w-xl">
                {adapter.description}
              </p>
              <p className="font-mono text-xs text-oahl-textFaint mt-2">by @{adapter.author}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Main: README ── */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-oahl-textMuted mb-4 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5" />
                Documentation
              </h3>

              <div className="bg-oahl-surface/25 border border-oahl-border/40 rounded-2xl p-6 sm:p-8 overflow-hidden break-words markdown-content">
                {loadingReadme ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-4 rounded-md bg-oahl-surface animate-pulse" style={{ width: `${75 + i * 5}%` }} />
                    ))}
                    <p className="font-mono text-xs text-oahl-textMuted pt-2">Loading README.md…</p>
                  </div>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {readme}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">

            {/* Install box */}
            {adapter.npm_package && (
              <div className="terminal-box">
                <div className="terminal-header">
                  <div className="terminal-dot bg-red-500/70" />
                  <div className="terminal-dot bg-yellow-400/70" />
                  <div className="terminal-dot bg-green-500/70" />
                  <span className="ml-auto font-mono text-[10px] text-oahl-textFaint">CLI</span>
                </div>
                <div className="terminal-body">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-oahl-tech font-mono text-sm shrink-0">$</span>
                    <span className="font-mono text-xs text-oahl-textMain truncate">
                      oahl install {adapter.npm_package}
                    </span>
                  </div>
                  <button
                    onClick={copyInstall}
                    className="text-oahl-textMuted hover:text-oahl-textMain transition-colors shrink-0 p-1 rounded-md hover:bg-white/5"
                    title="Copy command"
                  >
                    {copied
                      ? <CheckCircle2 className="w-4 h-4 text-oahl-tech" />
                      : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Capabilities */}
            <div className="sidebar-section">
              <span className="sidebar-label">Capabilities</span>
              <ul className="space-y-1.5 mb-2">
                {adapter.capabilities.slice(0, VISIBLE_CAPS_LIMIT).map(cap => (
                  <li
                    key={cap}
                    className="font-mono text-[11px] text-oahl-tech flex items-center gap-2.5 bg-oahl-bg/60 px-3 py-2 rounded-lg border border-oahl-border/40 break-all"
                  >
                    <span className="w-1.5 h-1.5 rounded-sm bg-oahl-tech/50 shrink-0" />
                    {cap}
                  </li>
                ))}
              </ul>
              {hasMoreCaps && (
                <button
                  onClick={() => setShowAllCaps(true)}
                  className="w-full text-center font-mono text-[11px] text-oahl-tech hover:text-oahl-accent transition-colors py-2 border border-dashed border-oahl-tech/25 hover:border-oahl-accent/40 rounded-lg bg-oahl-techDim hover:bg-oahl-accent/5"
                >
                  + {adapter.capabilities.length - VISIBLE_CAPS_LIMIT} more
                </button>
              )}
            </div>

            {/* Hardware tags */}
            <div className="sidebar-section">
              <span className="sidebar-label">Hardware Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {adapter.hardware_tags.map(tag => (
                  <span
                    key={tag}
                    className="font-mono text-[10px] text-oahl-textMuted bg-oahl-bg/60 border border-oahl-border/50 px-2.5 py-1 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Links */}
            <div className="sidebar-section">
              <span className="sidebar-label">Links</span>
              <div className="space-y-2">
                <a
                  href={adapter.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-xs text-oahl-textMuted hover:text-oahl-accent transition-colors group"
                >
                  <Github className="w-3.5 h-3.5 shrink-0" />
                  Source Repository
                  <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                {adapter.npm_package && (
                  <a
                    href={`https://www.npmjs.com/package/${adapter.npm_package}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-xs text-oahl-textMuted hover:text-oahl-accent transition-colors group"
                  >
                    <Package className="w-3.5 h-3.5 shrink-0" />
                    NPM Registry
                    <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Capabilities Modal ── */}
      {showAllCaps && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-oahl-bg/85 backdrop-blur-md"
            onClick={() => setShowAllCaps(false)}
          />
          <div className="relative bg-oahl-surface border border-oahl-border/60 rounded-2xl w-full max-w-md shadow-2xl shadow-black/60 max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-oahl-border/40">
              <div>
                <h3 className="text-base font-semibold">All Capabilities</h3>
                <p className="font-mono text-[10px] text-oahl-tech mt-0.5">{adapter.name}</p>
              </div>
              <button
                onClick={() => setShowAllCaps(false)}
                className="text-oahl-textMuted hover:text-oahl-textMain p-1.5 rounded-lg hover:bg-white/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-1.5 custom-scrollbar">
              {adapter.capabilities.map(cap => (
                <div
                  key={cap}
                  className="font-mono text-[11px] text-oahl-tech flex items-center gap-2.5 bg-oahl-bg px-3 py-2.5 border border-oahl-border/40 rounded-lg break-all"
                >
                  <span className="w-1.5 h-1.5 rounded-sm bg-oahl-tech/50 shrink-0" />
                  {cap}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
