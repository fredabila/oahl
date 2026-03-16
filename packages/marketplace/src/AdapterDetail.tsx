import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ArrowLeft, Github, Package, Copy, CheckCircle2, Terminal, X } from 'lucide-react';

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
  
  const [readme, setReadme] = useState<string>('');
  const [loadingReadme, setLoadingReadme] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAllCaps, setShowAllCaps] = useState(false);

  useEffect(() => {
    if (adapter?.readme_url) {
      setLoadingReadme(true);
      fetch(adapter.readme_url)
        .then(res => res.text())
        .then(text => {
          setReadme(text);
          setLoadingReadme(false);
        })
        .catch(() => {
          setReadme('> No README found or failed to load.');
          setLoadingReadme(false);
        });
    } else {
      setReadme('> No README provided for this adapter.');
    }
  }, [adapter]);

  if (!adapter) {
    return (
      <div className="min-h-screen bg-oahl-bg text-oahl-textMain pt-32 text-center">
        <h2 className="text-2xl font-mono text-oahl-tech">Adapter not found</h2>
        <Link to="/" className="mt-4 inline-block text-oahl-accent hover:underline">Return to Marketplace</Link>
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
    <div className="max-w-6xl mx-auto px-6 py-12 pt-32">
      <Link to="/" className="inline-flex items-center gap-2 text-oahl-textMuted hover:text-oahl-textMain transition-colors mb-8 font-mono text-sm">
        <ArrowLeft size={16} />
        [back_to_registry]
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative">
        {/* Main Content (Left, 2 columns) */}
        <div className="lg:col-span-2 space-y-8 min-w-0">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">{adapter.name}</h1>
              {adapter.version && (
                <span className="font-mono text-sm text-oahl-tech border border-oahl-border px-2 py-0.5 rounded-full">
                  v{adapter.version}
                </span>
              )}
            </div>
            <p className="text-xl text-oahl-textMuted leading-relaxed">
              {adapter.description}
            </p>
          </div>

          <div className="border-t border-oahl-border pt-8">
            <h3 className="font-mono text-oahl-tech uppercase tracking-widest text-sm mb-6">Documentation</h3>
            <div className="bg-oahl-surface/30 p-4 sm:p-8 rounded-xl border border-oahl-border/50 overflow-hidden break-words markdown-content">
              {loadingReadme ? (
                <div className="animate-pulse font-mono text-oahl-textMuted text-sm">Loading README.md from npm...</div>
              ) : (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]} 
                  rehypePlugins={[rehypeRaw]}
                >
                  {readme}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar (Right, 1 column) */}
        <div className="space-y-8">
          {/* Install Box */}
          <div className="bg-oahl-surface border border-oahl-border p-6 rounded-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-oahl-accent to-oahl-tech"></div>
            <h3 className="font-mono text-xs text-oahl-textMuted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Terminal size={14} /> Install via CLI
            </h3>
            <div className="bg-[#090808] border border-oahl-border p-3 rounded-lg flex items-center justify-between font-mono text-sm">
              <span className="text-oahl-textMain truncate mr-4">oahl install {adapter.npm_package || 'unknown'}</span>
              <button 
                onClick={copyInstall}
                className="text-oahl-textMuted hover:text-oahl-textMain transition-colors p-1 flex-shrink-0"
                title="Copy command"
              >
                {copied ? <CheckCircle2 size={16} className="text-oahl-tech" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Metadata Box */}
          <div className="bg-oahl-surface border border-oahl-border p-6 rounded-xl space-y-8">
            <div>
              <h3 className="font-mono text-xs text-oahl-textMuted uppercase tracking-wider mb-4">Capabilities</h3>
              <ul className="space-y-2 mb-3">
                {adapter.capabilities.slice(0, VISIBLE_CAPS_LIMIT).map(cap => (
                  <li key={cap} className="font-mono text-xs text-oahl-textMain flex items-center gap-3 bg-[#090808] px-3 py-2 border border-oahl-border rounded-md break-all">
                    <span className="w-1.5 h-1.5 bg-oahl-tech/50 rounded-full inline-block flex-shrink-0"></span>
                    {cap}
                  </li>
                ))}
              </ul>
              {hasMoreCaps && (
                <button 
                  onClick={() => setShowAllCaps(true)}
                  className="w-full text-center font-mono text-xs text-oahl-tech hover:text-oahl-accent transition-colors py-2 border border-dashed border-oahl-tech/30 hover:border-oahl-accent/50 rounded-md bg-oahl-tech/5 hover:bg-oahl-accent/5"
                >
                  + {adapter.capabilities.length - VISIBLE_CAPS_LIMIT} more (See all)
                </button>
              )}
            </div>

            <div>
              <h3 className="font-mono text-xs text-oahl-textMuted uppercase tracking-wider mb-3">Hardware Tags</h3>
              <div className="flex flex-wrap gap-2">
                {adapter.hardware_tags.map(tag => (
                  <span key={tag} className="font-mono text-[10px] text-oahl-textMuted bg-[#090808] border border-oahl-border px-2 py-1 rounded-md">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-mono text-xs text-oahl-textMuted uppercase tracking-wider mb-3">Links</h3>
              <div className="space-y-3">
                <a href={adapter.repository} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-oahl-accent transition-colors">
                  <Github size={16} /> Source Repository
                </a>
                {adapter.npm_package && (
                  <a href={`https://www.npmjs.com/package/${adapter.npm_package}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-oahl-accent transition-colors">
                    <Package size={16} /> NPM Registry
                  </a>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-oahl-border flex justify-between items-center text-xs text-oahl-textMuted font-mono">
              <span className="truncate mr-2">by @{adapter.author}</span>
              <span className="uppercase border border-oahl-border px-1.5 flex-shrink-0">{adapter.license}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Capabilities Modal */}
      {showAllCaps && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-[#0D0C0B]/90 backdrop-blur-sm" 
            onClick={() => setShowAllCaps(false)}
          ></div>
          <div className="relative bg-oahl-surface border border-oahl-border p-6 rounded-xl w-full max-w-md shadow-2xl shadow-black max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-oahl-border">
              <div>
                <h3 className="text-xl font-medium tracking-tight">All Capabilities</h3>
                <p className="font-mono text-xs text-oahl-tech mt-1">{adapter.name}</p>
              </div>
              <button 
                onClick={() => setShowAllCaps(false)}
                className="text-oahl-textMuted hover:text-oahl-textMain p-1 rounded-md hover:bg-oahl-border transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {adapter.capabilities.map(cap => (
                <div key={cap} className="font-mono text-sm text-oahl-textMain flex items-center gap-3 bg-[#090808] px-3 py-2.5 border border-oahl-border rounded-md break-all">
                  <span className="w-1.5 h-1.5 bg-oahl-tech/50 rounded-full inline-block flex-shrink-0"></span>
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

