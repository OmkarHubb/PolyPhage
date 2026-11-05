import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  ExternalLink,
  CheckCircle2,
  Filter,
  FileText,
  Thermometer,
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
    <div className="p-8 max-w-[1500px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#24242B] flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#9785E8]" />
          <span>Scientific Evidence & Literature Library</span>
        </h1>
        <p className="text-xs text-[#777780] mt-1">
          Strictly verified peer-reviewed publications establishing the biochemical basis of plastic depolymerization.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#A0A0A8] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search papers by author, title, DOI (10.1126/science...), or mechanism..."
            className="w-full bg-white border border-[#E7E7EB] rounded-xl pl-10 pr-4 py-2 text-xs text-[#24242B] placeholder-[#A0A0A8] focus:outline-none focus:border-[#9785E8] shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] text-[#777780] flex items-center gap-1 mr-1 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Journal:</span>
          </span>
          {journals.map(j => (
            <button
              key={j}
              onClick={() => setSelectedJournal(j)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedJournal === j
                  ? 'bg-[#9785E8] text-white shadow-xs'
                  : 'bg-white text-[#777780] hover:text-[#24242B] border border-[#E7E7EB]'
              }`}
            >
              {j}
            </button>
          ))}
        </div>
      </div>

      {/* Editorial Research-Library Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 5 Cols: List of Papers */}
        <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
          {filtered.map(paper => {
            const isSelected = activePaper?.id === paper.id;
            return (
              <div
                key={paper.id}
                onClick={() => setActivePaperId(paper.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                  isSelected
                    ? 'bg-white border-[#9785E8] shadow-xs ring-1 ring-[#9785E8]/30'
                    : 'bg-white border-[#E7E7EB] hover:border-[#D0D0D8]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#FAF9FD] text-[#7461CE] border border-[#EAE5FA]">
                    {paper.journal} ({paper.year})
                  </span>
                  <EvidenceBadge level={paper.evidence_level} />
                </div>

                <h3 className="text-xs font-bold text-[#24242B] leading-snug">
                  {paper.title}
                </h3>

                <p className="text-[11px] text-[#777780] line-clamp-1">
                  {paper.authors}
                </p>

                <div className="pt-1 flex items-center justify-between text-[11px] text-[#777780] font-mono">
                  <span>DOI: {paper.doi}</span>
                  <span className="text-[#2D8A6E] flex items-center gap-1 font-sans font-medium text-[10px]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 7 Cols: Detailed Paper Inspection */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-5">
          {activePaper ? (
            <>
              <div className="space-y-2 border-b border-[#E7E7EB] pb-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#7461CE]">
                    {activePaper.journal} · {activePaper.volume_issue_pages} ({activePaper.year})
                  </span>
                  <a
                    href={activePaper.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#7461CE] hover:text-[#9785E8] font-mono underline decoration-[#D5CBF7]"
                  >
                    <span>doi.org/{activePaper.doi}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <h2 className="text-base font-bold text-[#24242B] leading-snug">
                  {activePaper.title}
                </h2>

                <p className="text-xs text-[#777780]">
                  <span className="font-semibold text-[#24242B]">Authors: </span>
                  {activePaper.authors}
                </p>
              </div>

              {/* Abstract Summary */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0A0A8] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#9785E8]" />
                  <span>Abstract & Scientific Context</span>
                </span>
                <p className="text-xs text-[#24242B] leading-relaxed bg-[#FAF9FD] p-4 rounded-xl border border-[#EAE5FA]">
                  {activePaper.abstract_summary}
                </p>
              </div>

              {/* Key Verified Findings */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0A0A8] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#72C7B0]" />
                  <span>Key Supported Findings in PolyPhage Assessment Pipeline</span>
                </span>
                <ul className="space-y-2 text-xs">
                  {activePaper.key_findings.map((finding, idx) => (
                    <li
                      key={idx}
                      className="bg-[#FAFAFC] p-3 rounded-xl border border-[#E7E7EB] flex items-start gap-2.5 text-[#24242B]"
                    >
                      <span className="text-[#2D8A6E] font-bold shrink-0 mt-0.5">•</span>
                      <span className="leading-relaxed">{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Reported Experimental Assay Conditions */}
              {activePaper.experimental_conditions_reported && (
                <div className="space-y-2 pt-2 border-t border-[#E7E7EB]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0A0A8] flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-[#72C7B0]" />
                    <span>Reported Literature Assay Conditions</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#FAFAFC] p-3.5 rounded-xl border border-[#E7E7EB]">
                    {Object.entries(activePaper.experimental_conditions_reported).map(([k, v]) => (
                      <div key={k} className="flex flex-col">
                        <span className="text-[#777780] text-[10px] uppercase font-sans">
                          {k.replace(/_/g, ' ')}:
                        </span>
                        <span className="text-[#24242B] font-semibold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-xs text-[#777780]">
              Select a paper from the left to view verified findings and assay details.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
