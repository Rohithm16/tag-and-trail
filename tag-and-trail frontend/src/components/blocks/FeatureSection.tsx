import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Shield, Search, FileCheck, Share2 } from 'lucide-react';
import { Button } from '../ui/Button';

const features = [
  {
    id: 1,
    title: 'Unified tag inbox',
    icon: Inbox,
    description:
      'Automatically tag WhatsApp messages, links, and documents. All your content lands in one organized stream with context attached.',
  },
  {
    id: 2,
    title: 'Risk and trust scoring',
    icon: Shield,
    description:
      'ML-powered malware detection flags risky links and files before they reach your team. Real‑time threat intelligence keeps you safe.',
  },
  {
    id: 3,
    title: 'Search that remembers',
    icon: Search,
    description:
      'Find anything by tag, sender, or domain in seconds. Saved filters help teams quickly retrieve past conversations and documents.',
  },
  {
    id: 4,
    title: 'Audit‑ready trails',
    icon: FileCheck,
    description:
      'Every action is logged with timestamps and ownership. Exportable trails make compliance reviews fast and predictable.',
  },
  {
    id: 5,
    title: 'Private by default sharing',
    icon: Share2,
    description:
      'Share only what is needed with role‑based access. Keep sensitive links hidden while collaboration stays effortless.',
  },
];

export function FeatureSection() {
  const [activeTabId, setActiveTabId] = useState<number | null>(features[0]?.id ?? null);

  return (
    <section id="features" className="px-4 py-20 sm:px-6 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/20 bg-white/75 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:backdrop-blur-2xl md:p-10">
          <div className="mb-10 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Traceable by design
            </p>
            <h2 className="mt-3 bg-gradient-to-r from-sky-600 to-cyan-500 bg-clip-text text-3xl font-semibold text-transparent md:text-4xl">
              Build an auditable trail for every link
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 md:text-base">
              Tag, verify, and retrieve content in seconds. Your team gets shared context without sharing risk.
            </p>
          </div>
          <div className="mb-8 flex w-full flex-col items-start justify-between gap-10 md:flex-row">
            <div className="w-full md:w-1/2">
              {features.map((tab) => (
                <div key={tab.id} className="border-b border-slate-200 py-4">
                  <button
                    className="flex w-full items-center gap-3 text-left"
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    <tab.icon
                      className={`h-5 w-5 ${tab.id === activeTabId ? 'text-sky-500' : 'text-slate-500'}`}
                    />
                    <h6
                      className={`text-lg font-semibold md:text-xl ${tab.id === activeTabId ? 'text-slate-950' : 'text-slate-500'}`}
                    >
                      {tab.title}
                    </h6>
                  </button>
                  {tab.id === activeTabId && (
                    <p className="mt-2 pl-8 text-sm text-slate-500">{tab.description}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="relative hidden w-full md:block md:w-1/2">
              <div className="flex min-h-[300px] items-center justify-center overflow-hidden rounded-[1.5rem] bg-slate-100/60 p-3">
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                  {(() => {
                    const ActiveIcon = features.find((f) => f.id === activeTabId)?.icon || Inbox;
                    return (
                      <>
                        <ActiveIcon className="h-24 w-24 text-sky-500/80" />
                        <p className="max-w-sm text-sm text-slate-500">
                          {features.find((f) => f.id === activeTabId)?.description}
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/signup">Start tagging</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/login">Explore dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}