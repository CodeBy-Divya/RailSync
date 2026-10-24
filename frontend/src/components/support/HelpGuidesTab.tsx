import React, { useState, useMemo } from 'react';
import {
  BookOpen, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown,
  Search, Keyboard, FileText, Check, ShieldCheck, Sparkles, ExternalLink
} from 'lucide-react';
import { HELP_GUIDES, HelpGuide, APP_METADATA } from '../../data/supportData';

interface HelpGuidesTabProps {
  guideFeedback: Record<string, { helpful: number; unhelpful: number; userVoted?: 'yes' | 'no' }>;
  onVoteGuide: (guideId: string, isHelpful: boolean) => void;
  globalSearchQuery?: string;
  onOpenRaiseTicket?: () => void;
}

const CATEGORIES = [
  'All',
  'Work Request',
  'Rules & Regulations',
  'Emergency & Safety',
  'Features',
];

export const HelpGuidesTab: React.FC<HelpGuidesTabProps> = ({
  guideFeedback,
  onVoteGuide,
  globalSearchQuery = '',
  onOpenRaiseTicket,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedGuideId, setExpandedGuideId] = useState<string | null>('guide-01');
  const [localSearch, setLocalSearch] = useState('');

  const activeQuery = (globalSearchQuery || localSearch).trim().toLowerCase();

  const toggleAccordion = (id: string) => {
    setExpandedGuideId(prev => (prev === id ? null : id));
  };

  const filteredGuides = useMemo(() => {
    return HELP_GUIDES.filter(guide => {
      // Category filter
      if (selectedCategory !== 'All' && guide.category !== selectedCategory) {
        return false;
      }
      // Query search
      if (activeQuery) {
        const matchTitle = guide.title.toLowerCase().includes(activeQuery);
        const matchSummary = guide.summary.toLowerCase().includes(activeQuery);
        const matchRef = (guide.referenceCode || '').toLowerCase().includes(activeQuery);
        const matchContent = guide.content.some(c => c.toLowerCase().includes(activeQuery));
        return matchTitle || matchSummary || matchRef || matchContent;
      }
      return true;
    });
  }, [selectedCategory, activeQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Search Input (if not global) ────────────────── */}
      {!globalSearchQuery && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            padding: '6px 10px',
          }}
        >
          <Search size={14} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search 8 G&SR guides, SOPs, and procedures..."
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: 11.5,
              color: '#1E293B',
            }}
          />
        </div>
      )}

      {/* ── Category Filter Pills ───────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 2,
          scrollbarWidth: 'none',
        }}
      >
        {CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '3px 9px',
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: isSelected ? 700 : 500,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                background: isSelected ? '#1E293B' : '#F1F5F9',
                color: isSelected ? '#FFFFFF' : '#475569',
                border: isSelected ? '1px solid #1E293B' : '1px solid #E2E8F0',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ── Accordion List of Guides ────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredGuides.length === 0 ? (
          <div
            style={{
              padding: '28px 16px',
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: 10,
              border: '1px dashed #CBD5E1',
            }}
          >
            <BookOpen size={28} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
              No guides match your search
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
              Try searching for "ETR-1", "G&SR 15.06", "piggyback", or "Emergency Stop".
            </div>
          </div>
        ) : (
          filteredGuides.map(guide => {
            const isExpanded = expandedGuideId === guide.id;
            const feedback = guideFeedback[guide.id] || { helpful: 0, unhelpful: 0 };
            const hasVoted = Boolean(feedback.userVoted);

            return (
              <div
                key={guide.id}
                style={{
                  background: '#FFFFFF',
                  border: isExpanded ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                  borderRadius: 10,
                  overflow: 'hidden',
                  boxShadow: isExpanded ? '0 2px 6px rgba(37,99,235,0.06)' : '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Header (Always Visible) */}
                <button
                  type="button"
                  onClick={() => toggleAccordion(guide.id)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 10,
                    background: isExpanded ? '#F8FAFC' : '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {guide.referenceCode && (
                        <span
                          style={{
                            fontSize: 9.5,
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            border: '1px solid #BFDBFE',
                            fontFamily: 'monospace',
                          }}
                        >
                          {guide.referenceCode}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 600,
                          padding: '1px 5px',
                          borderRadius: 4,
                          background: '#F1F5F9',
                          color: '#475569',
                        }}
                      >
                        {guide.category}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
                      {guide.title}
                    </div>

                    <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.35 }}>
                      {guide.summary}
                    </div>
                  </div>

                  <div style={{ color: '#64748B', paddingTop: 2, flexShrink: 0 }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '12px 14px 14px',
                      borderTop: '1px solid #E2E8F0',
                      background: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    {/* Content Steps */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {guide.content.map((point, pIdx) => (
                        <div
                          key={pIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                            fontSize: 11.5,
                            color: '#334155',
                            lineHeight: 1.45,
                          }}
                        >
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              fontWeight: 700,
                              flexShrink: 0,
                              marginTop: 1,
                            }}
                          >
                            {pIdx + 1}
                          </span>
                          <div>{point}</div>
                        </div>
                      ))}
                    </div>

                    {/* Was this helpful feedback strip */}
                    <div
                      style={{
                        marginTop: 4,
                        paddingTop: 10,
                        borderTop: '1px dashed #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
                        {hasVoted ? 'Thanks for your feedback!' : 'Was this guide helpful?'}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          disabled={hasVoted}
                          onClick={() => onVoteGuide(guide.id, true)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: feedback.userVoted === 'yes' ? '#ECFDF5' : '#F8FAFC',
                            color: feedback.userVoted === 'yes' ? '#059669' : '#475569',
                            border: feedback.userVoted === 'yes' ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                            fontSize: 10.5,
                            fontWeight: 600,
                            cursor: hasVoted ? 'default' : 'pointer',
                          }}
                        >
                          <ThumbsUp size={11} />
                          <span>Yes ({feedback.helpful})</span>
                        </button>

                        <button
                          type="button"
                          disabled={hasVoted}
                          onClick={() => onVoteGuide(guide.id, false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: feedback.userVoted === 'no' ? '#FEF2F2' : '#F8FAFC',
                            color: feedback.userVoted === 'no' ? '#DC2626' : '#475569',
                            border: feedback.userVoted === 'no' ? '1px solid #FECDD3' : '1px solid #E2E8F0',
                            fontSize: 10.5,
                            fontWeight: 600,
                            cursor: hasVoted ? 'default' : 'pointer',
                          }}
                        >
                          <ThumbsDown size={11} />
                          <span>No ({feedback.unhelpful})</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Keyboard Shortcuts Card ────────────────────── */}
      <div
        style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Keyboard size={14} color="#475569" />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>
            Keyboard Shortcuts
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', background: '#FFFFFF', borderRadius: 4, border: '1px solid #E2E8F0' }}>
            <span style={{ color: '#475569' }}>Close Panels</span>
            <kbd style={{ padding: '1px 5px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 3, fontSize: 10, fontFamily: 'monospace' }}>Esc</kbd>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', background: '#FFFFFF', borderRadius: 4, border: '1px solid #E2E8F0' }}>
            <span style={{ color: '#475569' }}>Submit Form</span>
            <kbd style={{ padding: '1px 5px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 3, fontSize: 10, fontFamily: 'monospace' }}>Enter</kbd>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', background: '#FFFFFF', borderRadius: 4, border: '1px solid #E2E8F0' }}>
            <span style={{ color: '#475569' }}>New Line</span>
            <kbd style={{ padding: '1px 5px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 3, fontSize: 10, fontFamily: 'monospace' }}>Shift+↵</kbd>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', background: '#FFFFFF', borderRadius: 4, border: '1px solid #E2E8F0' }}>
            <span style={{ color: '#475569' }}>Quick Search</span>
            <kbd style={{ padding: '1px 5px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 3, fontSize: 10, fontFamily: 'monospace' }}>Ctrl+/</kbd>
          </div>
        </div>
      </div>

      {/* ── Application Info & Compliance Footer ────────── */}
      <div
        style={{
          padding: '10px 12px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          fontSize: 10.5,
          color: '#64748B',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, color: '#1E293B' }}>{APP_METADATA.appName}</span>
          <span style={{ fontFamily: 'monospace', color: '#2563EB', fontWeight: 600 }}>{APP_METADATA.version}</span>
        </div>
        <div>
          {APP_METADATA.division} · {APP_METADATA.headquarters}
        </div>
        <div style={{ color: '#059669', fontWeight: 500 }}>
          {APP_METADATA.legalStandard}
        </div>
      </div>
    </div>
  );
};

