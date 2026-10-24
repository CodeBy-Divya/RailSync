/**
 * TodayAtAGlance.tsx
 * ──────────────────
 * "Today at a glance" overview view, shown when the user clicks the RailSync
 * logo block in the left sidebar.
 *
 * Three vertically-stacked clickable summary cards that deep-link into the
 * Approval Portal (workspace view) with the matching tab pre-selected:
 *   Card 1 → Pending Approvals   (activeTab = 1)
 *   Card 2 → Work in Progress    (activeTab = 0)
 *   Card 3 → Teams on Track      (activeTab = 2)
 *
 * ── Tab deep-link wiring (see also App.tsx) ──────────────────────────────────
 *   onNavigateToPortal(tabIndex) is called on card click.
 *   App.tsx wires it to setActiveView('workspace') + setActiveTab(tabIndex).
 *   Because activeTab is lifted to App and passed as a prop to MiddleColumn,
 *   the portal opens immediately with the correct tab highlighted and its list
 *   rendered — no extra state needed inside the portal itself.
 */

import React from 'react';
import { Clock, CheckCircle2, Users } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
// One source of truth for all numbers. Counts are overridable via liveCounts
// prop (passed from App.tsx from the actual tabCounts derived from events).
const GLANCE_DATA = {
  pendingApprovals:   10,
  pendingForWardha:    4,
  workInProgress:      4,
  teamsOnTrack:        4,
  savedTime:      '3h 15m',
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────
export interface TodayAtAGlanceProps {
  /**
   * Called when a card is clicked.
   * 0 = Ongoing Work | 1 = Pending Approvals | 2 = History
   */
  onNavigateToPortal: (tabIndex: 0 | 1 | 2) => void;

  /**
   * Called when the "Teams on Track" card is clicked.
   * Opens the polished Teams on Track modal window over the current page.
   */
  onOpenTeamsOnTrack?: () => void;

  /**
   * Live counts derived from the real portal data (tabCounts from MiddleColumn
   * logic, computed in App.tsx). Falls back to GLANCE_DATA constants.
   */
  liveCounts?: {
    pending: number;   // maps to tabCounts[1]
    ongoing: number;   // maps to tabCounts[0]
    history: number;   // maps to tabCounts[2]
  };
}

// ── Card definition ───────────────────────────────────────────────────────────
interface CardDef {
  id: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  iconColor: string;
  chipLabel: string;
  chipBg: string;
  chipText: string;
  count: number;
  label: string;
  helper: string;
  tabIndex: 0 | 1 | 2;
  accentColor: string;
}

// ── GlanceCard sub-component ──────────────────────────────────────────────────
const GlanceCard: React.FC<{
  card: CardDef;
  onNavigate: (tabIndex: 0 | 1 | 2) => void;
  onOpenTeamsOnTrack?: () => void;
  animIndex: number;
}> = ({ card, onNavigate, onOpenTeamsOnTrack, animIndex }) => {
  const { id, Icon, iconColor, chipLabel, chipBg, chipText,
          count, label, helper, tabIndex, accentColor } = card;

  const activate = () => {
    if (id === 'history' && onOpenTeamsOnTrack) {
      onOpenTeamsOnTrack();
    } else {
      onNavigate(tabIndex);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
  };

  const isTeamsCard = id === 'history';

  return (
    <button
      type="button"
      id={isTeamsCard ? 'teams-on-track-card' : undefined}
      className="today-glance-card"
      onClick={activate}
      onKeyDown={onKeyDown}
      aria-label={
        isTeamsCard
          ? `Open Teams on Track overview popup. ${count} teams.`
          : `Open ${label} tab in the Approval Portal. ${count} items.`
      }
      style={{ animationDelay: `${animIndex * 70}ms` }}
    >
      {/* Row 1: Icon (top-left) + Status chip (top-right) */}
      <div className="today-glance-card-top">
        <Icon size={28} color={iconColor} strokeWidth={1.8} />
        <span
          className="today-glance-chip"
          style={{ background: chipBg, color: chipText }}
        >
          {chipLabel}
        </span>
      </div>

      {/* Row 2: Large bold count */}
      <div className="today-glance-number" style={{ color: accentColor }}>
        {count}
      </div>

      {/* Row 3: Bold dark-navy label */}
      <div className="today-glance-label">{label}</div>

      {/* Row 4: Monospace muted helper text */}
      <div className="today-glance-helper">{helper}</div>
    </button>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const TodayAtAGlance: React.FC<TodayAtAGlanceProps> = ({
  onNavigateToPortal,
  onOpenTeamsOnTrack,
  liveCounts,
}) => {
  // Resolve live counts → fall back to static constants
  const pending = liveCounts?.pending ?? GLANCE_DATA.pendingApprovals;
  const ongoing = liveCounts?.ongoing ?? GLANCE_DATA.workInProgress;
  const history = liveCounts?.history ?? GLANCE_DATA.teamsOnTrack;

  // Card definitions – add more cards here to extend the view
  const cards: CardDef[] = [
    {
      id:          'pending',
      Icon:        Clock,
      iconColor:   '#E27300',
      chipLabel:   'Waiting',
      chipBg:      '#FEF3C7',
      chipText:    '#92400E',
      count:       pending,
      label:       'Pending Approvals',
      helper:      `${GLANCE_DATA.pendingForWardha} need Wardha Station Master`,
      tabIndex:    1,
      accentColor: '#E27300',
    },
    {
      id:          'ongoing',
      Icon:        CheckCircle2,
      iconColor:   '#059669',
      chipLabel:   'Active',
      chipBg:      '#D1FAE5',
      chipText:    '#065F46',
      count:       ongoing,
      label:       'Work in Progress',
      helper:      'OHE Catenary & Point Padlock',
      tabIndex:    0,
      accentColor: '#059669',
    },
    {
      id:          'history',
      Icon:        Users,
      iconColor:   '#0F172A',
      chipLabel:   'Co-utilized',
      chipBg:      '#F1F5F9',
      chipText:    '#475569',
      count:       history,
      label:       'Teams on Track',
      helper:      `Joint possession saved ${GLANCE_DATA.savedTime}`,
      tabIndex:    2,
      accentColor: '#0F172A',
    },
  ];

  return (
    <section
      className="today-glance fade-in"
      aria-labelledby="today-glance-heading"
    >
      {/* Heading */}
      <div className="today-glance-header">
        <h1 id="today-glance-heading" className="today-glance-title">
          Today at a glance
        </h1>
        <p className="today-glance-subtitle">
          Click Pending or Ongoing to open the portal, or Teams on Track for the live gangs popup.
        </p>
      </div>

      {/* Vertical card column */}
      <div className="today-glance-cards">
        {cards.map((card, i) => (
          <GlanceCard
            key={card.id}
            card={card}
            onNavigate={onNavigateToPortal}
            onOpenTeamsOnTrack={onOpenTeamsOnTrack}
            animIndex={i}
          />
        ))}
      </div>
    </section>
  );
};

export default TodayAtAGlance;
