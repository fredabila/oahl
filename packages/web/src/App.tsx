import React, { useState, useEffect } from 'react';
import { Network, Server, Cpu, Activity, ShieldCheck, Zap, Code2, Terminal, CheckCircle2, Lock, Radio, Globe } from 'lucide-react';

interface Capability {
  name: string;
  nodes_available: number;
}

function App() {
  const [apiKey, setApiKey] = useState('');
  const [cloudUrl, setCloudUrl] = useState('https://oahl.onrender.com');
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'explorer' | 'code'>('explorer');

  // Simple typing effect state
  const [typedText, setTypedText] = useState('');
  const fullText = "Physical infrastructure for AI agents.";

  useEffect(() => {
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < fullText.length) {
        setTypedText(prev => prev + fullText.charAt(i));
        i++;
      } else {
        clearInterval(typingInterval);
      }
    }, 50);
    return () => clearInterval(typingInterval);
  }, []);

  const fetchCapabilities = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${cloudUrl}/v1/capabilities`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!res.ok) throw new Error('Unauthorized API Key or network error');
      
      const data = await res.json();
      setCapabilities(data.available_capabilities || []);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Cloud Registry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-oahl-bg font-sans selection:bg-oahl-accent/30 selection:text-white relative pb-24 overflow-x-hidden">
      
      {/* Background scanline effect for "Life" */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-blueprint"></div>
        <div className="absolute top-0 left-0 right-0 h-1 bg-oahl-accent/20 animate-scanline shadow-[0_0_20px_rgba(255,51,0,0.5)]"></div>
      </div>

      {/* Header */}
      <header className="border-b border-oahl-border bg-oahl-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-default">
            <div className="w-8 h-8 bg-oahl-textMain text-oahl-bg flex items-center justify-center font-bold font-mono tracking-tighter group-hover:bg-oahl-accent transition-colors">
              OA
            </div>
            <h1 className="text-lg font-bold tracking-tight text-oahl-textMain">OPEN AGENT <span className="text-oahl-textMuted font-normal">HARDWARE LAYER</span></h1>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-oahl-textMuted font-mono">
            <a href="#protocol" className="hover:text-oahl-accent transition-colors">/PROTOCOL</a>
            <a href="#nodes" className="hover:text-oahl-accent transition-colors">/NODES</a>
            <a href="https://github.com/your-username/oahl" className="hover:text-oahl-textMain transition-colors">/GITHUB</a>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-oahl-tech border border-oahl-border px-3 py-1.5 bg-black">
              <div className="w-2 h-2 bg-oahl-tech rounded-full animate-pulse"></div>
              SYS.ONLINE
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-16 relative z-10">
        
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row gap-12 items-center justify-between border-b border-oahl-border pb-20 animate-slide-up">
          
          <div className="flex-1 max-w-3xl">
            <div className="inline-flex items-center gap-2 font-mono text-xs text-oahl-tech mb-8 uppercase tracking-widest border border-oahl-tech/30 bg-oahl-tech/5 px-3 py-1.5">
              <Activity className="w-3 h-3 animate-spin-slow" /> v0.1.0 Protocol Deployed
            </div>
            
            <h2 className="text-5xl md:text-7xl font-bold text-oahl-textMain mb-6 tracking-tight leading-[1.1] min-h-[160px] md:min-h-[180px]">
              {typedText}
              <span className="animate-pulse text-oahl-accent">_</span>
            </h2>
            
            <p className="text-lg text-oahl-textMuted mb-10 font-mono leading-relaxed border-l-2 border-oahl-border pl-6 py-2">
              Stop building bespoke wrappers. OAHL is the standard protocol that turns physical webcams, SDRs, and robots into secure, global API endpoints.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 font-mono">
              <button className="w-full sm:w-auto px-8 py-4 bg-oahl-textMain hover:bg-oahl-accent text-oahl-bg hover:text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all">
                <Server className="w-4 h-4" /> Start Node
              </button>
              <div className="w-full sm:w-auto px-6 py-4 panel text-sm text-oahl-textMuted flex items-center justify-between gap-4 group">
                <span className="flex items-center gap-2 text-oahl-textMain"><span className="text-oahl-accent">❯</span> npm install -g @fredabila/oahl</span>
              </div>
            </div>
          </div>

          {/* Interactive Graphic */}
          <div className="hidden lg:flex w-full max-w-md panel p-8 flex-col gap-6 relative group cursor-crosshair">
            <div className="absolute top-0 right-0 p-4 font-mono text-[10px] text-oahl-textMuted opacity-50">NODE_TOPOLOGY_MAP</div>
            
            {/* Diagram */}
            <div className="flex items-center justify-between">
              <div className="w-16 h-16 border-2 border-dashed border-oahl-border rounded-full flex items-center justify-center text-oahl-textMuted group-hover:text-oahl-textMain transition-colors">
                <Terminal className="w-6 h-6" />
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-oahl-border via-oahl-accent to-oahl-border relative">
                 <div className="absolute top-1/2 -translate-y-1/2 left-0 w-2 h-2 bg-oahl-accent rounded-full animate-[ping_2s_infinite]"></div>
              </div>
              <div className="w-20 h-20 bg-oahl-surface border-2 border-oahl-accent flex items-center justify-center text-oahl-accent relative shadow-[0_0_30px_rgba(255,51,0,0.15)]">
                <Globe className="w-8 h-8" />
                <div className="absolute -bottom-6 font-mono text-xs whitespace-nowrap text-oahl-textMain">REGISTRY</div>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-oahl-border via-oahl-tech to-oahl-border relative">
                <div className="absolute top-1/2 -translate-y-1/2 right-0 w-2 h-2 bg-oahl-tech rounded-full animate-[ping_2s_infinite_0.5s]"></div>
              </div>
              <div className="w-16 h-16 border-2 border-solid border-oahl-border bg-oahl-surface flex items-center justify-center text-oahl-tech group-hover:border-oahl-tech transition-colors">
                <Cpu className="w-6 h-6" />
              </div>
            </div>
            
            {/* Live log simulation */}
            <div className="mt-4 bg-black border border-oahl-border p-4 h-32 overflow-hidden font-mono text-xs flex flex-col justify-end">
              <div className="text-oahl-textMuted opacity-50">[00:00:01] OAHL Core initialized</div>
              <div className="text-oahl-textMuted opacity-70">[00:00:02] Loading adapter: usb-camera</div>
              <div className="text-oahl-textMain opacity-90">[00:00:03] Device found: /dev/video0</div>
              <div className="text-oahl-tech font-bold">[00:00:04] Node 🟢 ONLINE. Awaiting Agent.</div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div id="protocol" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 animate-slide-up" style={{animationDelay: '0.2s'}}>
           <div className="panel p-8 group hover:-translate-y-1">
             <div className="w-12 h-12 bg-[#FF3300]/10 border border-[#FF3300]/20 flex items-center justify-center mb-6 text-[#FF3300] group-hover:scale-110 transition-transform">
               <ShieldCheck className="w-6 h-6" />
             </div>
             <h3 className="text-xl font-bold text-oahl-textMain mb-3 font-mono tracking-tight">ZERO_TRUST</h3>
             <p className="text-oahl-textMuted text-sm leading-relaxed">
               Hardware remains under total local control. JSON policies enforce strict duration limits and block unapproved parameters (e.g. locking radios to receive-only).
             </p>
           </div>
           
           <div className="panel p-8 group hover:-translate-y-1">
             <div className="w-12 h-12 bg-[#00FF41]/10 border border-[#00FF41]/20 flex items-center justify-center mb-6 text-[#00FF41] group-hover:scale-110 transition-transform">
               <Zap className="w-6 h-6" />
             </div>
             <h3 className="text-xl font-bold text-oahl-textMain mb-3 font-mono tracking-tight">ZERO_CODE</h3>
             <p className="text-oahl-textMuted text-sm leading-relaxed">
               Standard devices like USB webcams are plug-and-play. The CLI wizard auto-generates the local node setup without writing a single line of driver code.
             </p>
           </div>
           
           <div className="panel p-8 group hover:-translate-y-1">
             <div className="w-12 h-12 bg-[#3388FF]/10 border border-[#3388FF]/20 flex items-center justify-center mb-6 text-[#3388FF] group-hover:scale-110 transition-transform">
               <Network className="w-6 h-6" />
             </div>
             <h3 className="text-xl font-bold text-oahl-textMain mb-3 font-mono tracking-tight">ABSTRACTION</h3>
             <p className="text-oahl-textMuted text-sm leading-relaxed">
               Agents don't need USB/serial logic. They request standard schema definitions like <code className="text-[#3388FF]">camera.capture</code>, and the network dynamically routes it.
             </p>
           </div>
        </div>

        {/* Interactive Console */}
        <div className="mt-24 panel overflow-hidden flex flex-col mb-12 animate-slide-up" style={{animationDelay: '0.4s'}}>
          
          {/* Tabs */}
          <div className="flex border-b border-oahl-border font-mono text-sm bg-black">
            <button 
              onClick={() => setActiveTab('explorer')}
              className={`px-6 py-4 font-bold tracking-widest transition-all border-b-2 flex items-center gap-3 ${activeTab === 'explorer' ? 'bg-oahl-surface text-oahl-accent border-oahl-accent' : 'text-oahl-textMuted hover:text-oahl-textMain border-transparent hover:bg-white/5'}`}
            >
              <Radio className="w-4 h-4" /> REGISTRY_SCANNER
            </button>
            <button 
              onClick={() => setActiveTab('code')}
              className={`px-6 py-4 font-bold tracking-widest transition-all border-b-2 border-l border-l-oahl-border flex items-center gap-3 ${activeTab === 'code' ? 'bg-oahl-surface text-oahl-textMain border-oahl-textMain' : 'text-oahl-textMuted hover:text-oahl-textMain border-transparent hover:bg-white/5'}`}
            >
              <Code2 className="w-4 h-4" /> AGENT_INTEGRATION
            </button>
          </div>

          <div className="p-6 md:p-10 bg-oahl-surface min-h-[450px]">
            {activeTab === 'explorer' ? (
              <div className="space-y-8 animate-fade-in">
                
                {/* Form row */}
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-oahl-border pb-8">
                  <div className="max-w-md">
                    <h2 className="text-2xl font-bold text-oahl-textMain mb-2 font-mono uppercase">Live Network Explorer</h2>
                    <p className="text-oahl-textMuted text-sm leading-relaxed">Authenticate to query the global capability map. The cloud registry will return currently online hardware capabilities.</p>
                  </div>
                  
                  <form onSubmit={fetchCapabilities} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 font-mono">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-oahl-textMuted uppercase tracking-widest">Target Cloud URL</label>
                      <input 
                        type="url" 
                        value={cloudUrl}
                        onChange={(e) => setCloudUrl(e.target.value)}
                        placeholder="CLOUD_URL"
                        className="input-field w-full sm:w-64 px-4 py-3 text-sm rounded-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-oahl-textMuted uppercase tracking-widest">Agent API Key</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-oahl-textMuted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                          type="password" 
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="AGENT_KEY"
                          className="input-field w-full sm:w-64 pl-10 pr-4 py-3 text-sm rounded-none"
                        />
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={loading || !apiKey}
                      className="w-full sm:w-auto bg-oahl-textMain hover:bg-oahl-accent text-oahl-bg hover:text-white px-8 py-3 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-auto"
                    >
                      {loading ? 'SCANNING...' : 'CONNECT'}
                    </button>
                  </form>
                </div>

                {/* Error State */}
                {error && (
                  <div className="border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm font-mono flex items-center gap-3 animate-fade-in">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                    {error}
                  </div>
                )}

                {/* Empty State */}
                {!loading && capabilities.length === 0 && !error && (
                  <div className="flex flex-col items-center justify-center py-16 text-oahl-textMuted border border-dashed border-oahl-border bg-black/50">
                    <Activity className="w-10 h-10 mb-4 opacity-50" />
                    <p className="font-mono text-sm uppercase tracking-widest">Awaiting authentication</p>
                  </div>
                )}

                {/* Results State */}
                {capabilities.length > 0 && (
                  <div className="animate-fade-in">
                     <div className="flex items-center justify-between mb-6">
                        <div className="font-mono text-xs text-oahl-tech border border-oahl-tech/30 bg-oahl-tech/10 px-3 py-1 flex items-center gap-2">
                          <div className="w-2 h-2 bg-oahl-tech rounded-full animate-pulse"></div>
                          CAPABILITIES FOUND: {capabilities.length}
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {capabilities.map((cap) => (
                        <div key={cap.name} className="border border-oahl-border bg-black p-6 hover:border-oahl-accent transition-colors group relative overflow-hidden">
                          {/* Accent line */}
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-oahl-border group-hover:bg-oahl-accent transition-colors"></div>
                          
                          <div className="flex justify-between items-start mb-6">
                            <span className="font-mono text-sm text-oahl-textMain font-bold">{cap.name}</span>
                            <div className="flex items-center gap-2 border border-oahl-border px-2 py-1 bg-oahl-surface">
                              <span className="text-xs font-mono text-oahl-textMuted">{cap.nodes_available} NODES</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-oahl-tech font-mono font-bold mt-auto">
                            <CheckCircle2 className="w-4 h-4" /> STATUS: READY
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-fade-in h-full flex flex-col">
                <div className="mb-6 flex items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-oahl-textMain mb-2 font-mono uppercase">Agent SDK Integration</h2>
                    <p className="text-oahl-textMuted text-sm leading-relaxed">Provide your LLM agent with this tool snippet to interface with real hardware via the Cloud.</p>
                  </div>
                </div>
                
                {/* Horizontal scroll fixed with better padding and scrollbar */}
                <div className="flex-1 bg-black border border-oahl-border relative flex flex-col">
                  <div className="border-b border-oahl-border bg-oahl-surface px-4 py-2 flex items-center justify-between">
                    <span className="font-mono text-xs text-oahl-textMuted">agent_tool.py</span>
                    <span className="font-mono text-[10px] text-oahl-accent border border-oahl-accent px-2">PYTHON</span>
                  </div>
                  <div className="p-6 overflow-x-auto code-scroll flex-1">
<pre className="font-mono text-sm leading-loose text-[#A3A3A3] whitespace-pre min-w-max">
<span className="text-[#FF3300] font-bold">from</span> oahl.sdk <span className="text-[#FF3300] font-bold">import</span> Client

<span className="text-[#666666] italic"># 1. Initialize agent connection to the Cloud Registry</span>
client = Client(api_key=<span className="text-[#00FF41]">"dev_agent_key"</span>)

<span className="text-[#666666] italic"># 2. Agent requests a capability (Cloud routes to a physical node)</span>
session = client.request_hardware(
    capability=<span className="text-[#00FF41]">"camera.capture"</span>,
    constraints=&#123;<span className="text-[#00FF41]">"location"</span>: <span className="text-[#00FF41]">"US"</span>&#125;
)

<span className="text-[#666666] italic"># 3. Execute action on remote hardware</span>
result = session.execute(
    args=&#123;<span className="text-[#00FF41]">"resolution"</span>: <span className="text-[#00FF41]">"1080p"</span>&#125;
)

<span className="text-[#3388FF]">print</span>(result.image_url)

<span className="text-[#666666] italic"># 4. Release hardware back to pool</span>
session.stop()
</pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <footer className="max-w-7xl mx-auto px-6 pt-8 border-t border-oahl-border flex flex-col sm:flex-row justify-between items-center text-xs font-mono text-oahl-textMuted gap-4">
        <p>OAHL PROTOCOL &copy; {new Date().getFullYear()}</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-oahl-textMain transition-colors">DOCUMENTATION</a>
          <a href="#" className="hover:text-oahl-textMain transition-colors">GITHUB</a>
          <a href="#" className="hover:text-oahl-textMain transition-colors">NPM</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
