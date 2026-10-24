import React, { useState, useMemo } from 'react';
import {
  Phone, Copy, Check, MessageSquare, ChevronDown, ChevronUp,
  Search, Users, Shield, Clock, Building2, UserCheck, UserX, AlertCircle
} from 'lucide-react';
import {
  EMERGENCY_HOTLINES,
  ESCALATION_MATRIX,
  DIRECTORY_CONTACTS,
  SupportContact,
  EscalationLevel
} from '../../data/supportData';
import { EmergencyCallCard } from './EmergencyCallCard';

interface ContactsTabProps {
  onReportEmergency: (reason: string, location?: string) => void;
  onOpenMessages?: (dept?: string) => void;
  globalSearchQuery?: string;
}

const DEPARTMENTS = [
  { id: 'ALL', label: 'All Departments' },
  { id: 'OPERATING', label: 'Operating' },
  { id: 'OHE', label: 'OHE / Electrical' },
  { id: 'S_AND_T', label: 'S&T (Signals)' },
  { id: 'CIVIL_P_WAY', label: 'Civil / P-Way' },
  { id: 'MECHANICAL_CW', label: 'Mechanical' },
  { id: 'SAFETY', label: 'Safety' },
];

export const ContactsTab: React.FC<ContactsTabProps> = ({
  onReportEmergency,
  onOpenMessages,
  globalSearchQuery = '',
}) => {
  const [isEscalationOpen, setIsEscalationOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [onDutyOnly, setOnDutyOnly] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeQuery = (globalSearchQuery || localSearch).trim().toLowerCase();

  const handleCopy = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (_) {}
  };

  const filteredContacts = useMemo(() => {
    return DIRECTORY_CONTACTS.filter(contact => {
      // Dept filter
      if (selectedDept !== 'ALL' && contact.department !== selectedDept) {
        return false;
      }
      // On duty filter
      if (onDutyOnly && !contact.isOnDuty) {
        return false;
      }
      // Query filter
      if (activeQuery) {
        const matchName = contact.name.toLowerCase().includes(activeQuery);
        const matchDesig = contact.designation.toLowerCase().includes(activeQuery);
        const matchSec = contact.section.toLowerCase().includes(activeQuery);
        const matchExt = contact.extension.toLowerCase().includes(activeQuery);
        const matchPhone = contact.phone.toLowerCase().includes(activeQuery);
        const matchDept = contact.department.toLowerCase().includes(activeQuery);
        return matchName || matchDesig || matchSec || matchExt || matchPhone || matchDept;
      }
      return true;
    });
  }, [selectedDept, onDutyOnly, activeQuery]);

  const getDeptColor = (dept: string) => {
    switch (dept) {
      case 'OPERATING':
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
      case 'OHE':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
      case 'S_AND_T':
        return { bg: '#F3E8FF', text: '#7E22CE', border: '#E9D5FF' };
      case 'CIVIL_P_WAY':
        return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' };
      case 'MECHANICAL_CW':
        return { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' };
      case 'SAFETY':
        return { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── 1. Emergency Strip & Hotlines (DCC Ext. 4022) ─ */}
      <EmergencyCallCard onReportEmergency={onReportEmergency} />

      {/* ── 2. Statutory Escalation Matrix (Collapsible) ── */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <button
          type="button"
          onClick={() => setIsEscalationOpen(prev => !prev)}
          style={{
            width: '100%',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isEscalationOpen ? '#F8FAFC' : '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: '#EEF2FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4F46E5',
              }}
            >
              <Shield size={14} />
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1E293B' }}>
                Statutory Escalation Matrix
              </div>
              <div style={{ fontSize: 10.5, color: '#64748B' }}>
                3-Tier Divisional Chain of Command (G&SR Compliant)
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B' }}>
            <span style={{ fontSize: 11, fontWeight: 500 }}>
              {isEscalationOpen ? 'Hide' : 'View Levels'}
            </span>
            {isEscalationOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {isEscalationOpen && (
          <div
            style={{
              padding: '10px 14px 14px',
              borderTop: '1px solid #F1F5F9',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              background: '#F8FAFC',
            }}
          >
            {ESCALATION_MATRIX.map(level => (
              <div
                key={level.level}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: level.level === 1 ? '#DBEAFE' : level.level === 2 ? '#FEF3C7' : '#FEE2E2',
                        color: level.level === 1 ? '#1D4ED8' : level.level === 2 ? '#B45309' : '#DC2626',
                      }}
                    >
                      LEVEL {level.level}
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1E293B' }}>
                      {level.designation}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: '#64748B' }}>
                    <Clock size={12} color="#059669" />
                    <span style={{ color: '#059669', fontWeight: 600 }}>{level.responseTime}</span>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.35 }}>
                  {level.responsibilities}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 4,
                    paddingTop: 6,
                    borderTop: '1px dashed #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', fontFamily: 'monospace' }}>
                    {level.contact}
                  </span>
                  <a
                    href={level.telUri}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: '#2563EB',
                      textDecoration: 'none',
                      background: '#EFF6FF',
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}
                  >
                    <Phone size={11} /> Call Level {level.level}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 3. Contact Directory & Filters ─────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Directory header with Demo Data badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={15} color="#1E293B" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
              Employee Directory
            </span>
            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
              ({filteredContacts.length})
            </span>
          </div>

          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: 9999,
              background: '#F1F5F9',
              color: '#475569',
              border: '1px solid #E2E8F0',
            }}
          >
            Demo roster
          </span>
        </div>

        {/* Local Search (if global not provided) */}
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
              placeholder="Filter by name, designation, section, extension..."
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

        {/* Filter Row: Dept pills & On-duty toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Dept Pills */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              paddingBottom: 2,
              scrollbarWidth: 'none',
            }}
          >
            {DEPARTMENTS.map(dept => {
              const isSelected = selectedDept === dept.id;
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setSelectedDept(dept.id)}
                  style={{
                    padding: '4px 9px',
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
                  {dept.label}
                </button>
              );
            })}
          </div>

          {/* On-Duty toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: '#475569',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={onDutyOnly}
                onChange={e => setOnDutyOnly(e.target.checked)}
                style={{ accentColor: '#059669', width: 14, height: 14, cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 600 }}>Show on-duty staff only</span>
            </label>

            <span style={{ fontSize: 10.5, color: '#94A3B8' }}>
              Showing {filteredContacts.length} of {DIRECTORY_CONTACTS.length}
            </span>
          </div>
        </div>

        {/* Contacts Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {filteredContacts.length === 0 ? (
            <div
              style={{
                padding: '28px 16px',
                textAlign: 'center',
                background: '#FFFFFF',
                borderRadius: 10,
                border: '1px dashed #CBD5E1',
              }}
            >
              <Users size={28} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>
                No personnel found
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                Try adjusting the department filter or search terms.
              </div>
            </div>
          ) : (
            filteredContacts.map(contact => {
              const deptStyle = getDeptColor(contact.department);
              const isCopied = copiedId === contact.id;

              return (
                <div
                  key={contact.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  {/* Top row: Avatar + Name + Dept badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Avatar with status dot */}
                      <div style={{ position: 'relative' }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: '#1E293B',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {contact.avatarInitials}
                        </div>
                        {/* On / off-duty indicator */}
                        <span
                          title={contact.isOnDuty ? 'On Duty' : 'Off Duty'}
                          style={{
                            position: 'absolute',
                            bottom: -1,
                            right: -1,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: contact.isOnDuty ? '#10B981' : '#94A3B8',
                            border: '2px solid #FFFFFF',
                          }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                            {contact.name}
                          </span>
                          <span
                            style={{
                              fontSize: 9.5,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: deptStyle.bg,
                              color: deptStyle.text,
                              border: `1px solid ${deptStyle.border}`,
                            }}
                          >
                            {contact.department.replace('_', ' ')}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>
                          {contact.designation}
                        </div>
                      </div>
                    </div>

                    {/* Shift / status text */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: contact.isOnDuty ? '#059669' : '#64748B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 3,
                        }}
                      >
                        {contact.isOnDuty ? <UserCheck size={11} /> : <UserX size={11} />}
                        {contact.isOnDuty ? 'On Duty' : 'Off Duty'}
                      </div>
                      {contact.dutyShift && (
                        <div style={{ fontSize: 9.5, color: '#94A3B8', marginTop: 1 }}>
                          {contact.dutyShift}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section & Extension details */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: '#64748B',
                      background: '#F8FAFC',
                      padding: '5px 8px',
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Building2 size={12} color="#94A3B8" />
                      <span style={{ color: '#334155', fontWeight: 500 }}>{contact.section}</span>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                      {contact.extension}
                    </div>
                  </div>

                  {/* Actions: Call, Message, Copy */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <a
                      href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: '#EFF6FF',
                        color: '#1D4ED8',
                        border: '1px solid #BFDBFE',
                        fontSize: 11,
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'background 0.15s',
                      }}
                    >
                      <Phone size={12} />
                      <span>Call {contact.extension}</span>
                    </a>

                    {onOpenMessages && (
                      <button
                        type="button"
                        onClick={() => onOpenMessages(contact.department)}
                        title={`Open chat pre-tagged @${contact.department}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: '#F1F5F9',
                          color: '#334155',
                          border: '1px solid #CBD5E1',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <MessageSquare size={12} color="#475569" />
                        <span>Chat</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopy(contact.phone, contact.id)}
                      title="Copy direct phone number"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '6px 9px',
                        borderRadius: 6,
                        background: isCopied ? '#ECFDF5' : '#F8FAFC',
                        color: isCopied ? '#059669' : '#64748B',
                        border: isCopied ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {isCopied ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

