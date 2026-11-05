import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  ExternalLink,
  CheckCircle2,
  Filter,
  FileText,
  Thermometer,
  Layers,
} from 'lucide-react';
import { EvidenceRecord } from '../types';
import { EvidenceBadge } from '../components/common/Badges';

interface EvidenceLibraryPageProps {
  evidenceList: EvidenceRecord[];
}

export const EvidenceLibraryPage: React.FC<EvidenceLibraryPageProps> = ({ evidenceList }) => {
  const [search, setSearch] = useState('');
  const [selectedJournal, setSelectedJournal] = useState<string>('All');
  const [activePaperId, setActivePaperId] = useState<string | null>(evidenceList[0]?.id || null);

  const journals = ['All', ...Array.from(new Set(evidenceList.map(e => e.journal)))];

  const filtered = evidenceList.filter(e => {
    const matchesJournal = selectedJournal === 'All' || e.journal === selectedJournal;
    const matchesSearch =
      search.trim() === '' ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.authors.toLowerCase().includes(search.toLowerCase()) ||
      e.doi.toLowerCase().includes(search.toLowerCase()) ||
      e.abstract_summary.toLowerCase().includes(search.toLowerCase());
    return matchesJournal && matchesSearch;
  });

  const activePaper = evidenceList.find(e => e.id === activePaperId) || evidenceList[0];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <span>Curated Scientific Evidence Library</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Strictly verified peer-reviewed publications establishing the biochemical basis of plastic depolymerization.
          Zero synthetic or unverified citations.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search papers by author, title, DOI (10.1126/science...), or mechanism..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
            <span>Journal:</span>
          </span>
          {journals.map(j => (
            <button
              key={j}
              onClick={() => setSelectedJournal(j)}
              className={`px-2.5 py-1 rounded text-xs whitespace-nowrap transition cursor-pointer ${
                selectedJournal === j
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {j}
            </button>
          ))}
        </div>
      </div>

      {/* Main Evidence Layout: List on Left, Deep View on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: List of papers */}
        <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
          {filtered.map(paper => {
            const isSelected = activePaper?.id === paper.id;
            return (
              <div
                key={paper.id}
                onClick={() => setActivePaperId(paper.id)}
                className={`p-4 rounded-lg border transition cursor-pointer space-y-2 ${
                  isSelected
                    ? 'bg-slate-900 border-blue-500/80 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60">
                    {paper.journal} ({paper.year})
                  </span>
                  <EvidenceBadge level={paper.evidence_level} />
                </div>

                <h3 className="text-xs font-semibold text-slate-100 leading-snug">
                  {paper.title}
                </h3>

                <p className="text-[11px] text-slate-400 line-clamp-1">
                  {paper.authors}
                </p>

                <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>DOI: {paper.doi}</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-sans">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Detailed Paper Inspection */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-5">
          {activePaper ? (
            <>
              <div className="space-y-2 border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-blue-400 font-semibold">
                    {activePaper.journal} · {activePaper.volume_issue_pages} ({activePaper.year})
                  </span>
                  <a
                    href={activePaper.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-mono underline decoration-blue-500/50"
                  >
                    <span>doi.org/{activePaper.doi}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <h2 className="text-base font-bold text-slate-100 leading-snug">
                  {activePaper.title}
                </h2>

                <p className="text-xs text-slate-300">
                  <span className="text-slate-500 font-medium">Authors: </span>
                  {activePaper.authors}
                </p>
              </div>

              {/* Abstract Summary */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Abstract & Context Summary</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
                  {activePaper.abstract_summary}
                </p>
              </div>

              {/* Verified Key Findings */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Key Literature Findings Supported in PolyPhage Engine</span>
                </h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  {activePaper.key_findings.map((finding, idx) => (
                    <li
                      key={idx}
                      className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80 flex items-start gap-2.5"
                    >
                      <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                      <span className="leading-relaxed">{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Reported Experimental Assay Conditions */}
              {activePaper.experimental_conditions_reported && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Reported Literature Assay Conditions</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950 p-3 rounded border border-slate-800">
                    {Object.entries(activePaper.experimental_conditions_reported).map(([k, v]) => (
                      <div key={k} className="flex flex-col">
                        <span className="text-slate-500 text-[10px] uppercase">
                          {k.replace(/_/g, ' ')}:
                        </span>
                        <span className="text-slate-200 font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              Select a scientific paper to inspect abstract, verified findings, and assay conditions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
