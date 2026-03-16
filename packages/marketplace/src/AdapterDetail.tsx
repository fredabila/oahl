import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Github, Package, Copy, CheckCircle2, Terminal } from 'lucide-react';

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

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 pt-32">
      <Link to="/" className="inline-flex items-center gap-2 text-oahl-textMuted hover:text-oahl-textMain transition-colors mb-8 font-mono text-sm">
        <ArrowLeft size={16} />
        [back_to_registry]
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content (Left, 2 columns) */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
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
            <div className="prose prose-invert prose-slate max-w-none prose-headings:font-sans prose-headings:font-medium prose-a:text-oahl-accent prose-code:text-oahl-tech prose-pre:bg-oahl-surface prose-pre:border-oahl-border prose-pre:border bg-oahl-surface/30 p-8 rounded-xl border border-oahl-border/50">
              {loadingReadme ? (
                <div className="animate-pulse font-mono text-oahl-textMuted text-sm">Loading README.md from npm...</div>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>
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
            <div className="bg-oahl-bg border border-oahl-border/50 p-3 rounded-lg flex items-center justify-between font-mono text-sm">
              <span className="text-oahl-textMain truncate mr-4">oahl install {adapter.npm_package || 'unknown'}</span>
              <button 
                onClick={copyInstall}
                className="text-oahl-textMuted hover:text-oahl-textMain transition-colors p-1"
                title="Copy command"
              >
                {copied ? <CheckCircle2 size={16} className="text-oahl-tech" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Metadata Box */}
          <div className="bg-oahl-surface border border-oahl-border p-6 rounded-xl space-y-6">
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

            <div>
              <h3 className="font-mono text-xs text-oahl-textMuted uppercase tracking-wider mb-3">Capabilities</h3>
              <ul className="space-y-2">
                {adapter.capabilities.map(cap => (
                  <li key={cap} className="font-mono text-xs text-oahl-textMain flex items-center gap-2 bg-oahl-bg px-2 py-1.5 border border-oahl-border rounded-md">
                    <span className="w-1.5 h-1.5 bg-oahl-tech/50 rounded-full inline-block"></span>
                    {cap}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-mono text-xs text-oahl-textMuted uppercase tracking-wider mb-3">Hardware Tags</h3>
              <div className="flex flex-wrap gap-2">
                {adapter.hardware_tags.map(tag => (
                  <span key={tag} className="font-mono text-[10px] text-oahl-textMuted bg-oahl-bg border border-oahl-border px-2 py-1 rounded-md">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-oahl-border flex justify-between items-center text-xs text-oahl-textMuted font-mono">
              <span>Author: @{adapter.author}</span>
              <span className="uppercase border border-oahl-border px-1.5">{adapter.license}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
