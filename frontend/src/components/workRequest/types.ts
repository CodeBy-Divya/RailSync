import { Department } from '../../types';

export interface WorkRequestFormData {
  division: string;
  sectionId: string;
  sectionLabel: string;
  trackId: 'UP_MAIN' | 'DN_MAIN' | 'LOOP_01' | 'YARD_04';
  kmStart: string;
  kmEnd: string;
  workDate: string;
  startTime: string;
  endTime: string;
  powerTrip: boolean;
  trafficBlock: boolean;
  speedRestriction: boolean;
  pointClamping: boolean;
  department: Department;
  supervisorName: string;
  supervisorDesignation: string;
  description: string;
  teamSize: string;
  contactNumber: string;
  idempotencyKey: string;
  step: number;
  lastSavedAt?: string;
}

export interface SectionMetadata {
  id: string;
  division: string;
  label: string;
  shortName: string;
  junctions: string;
  kmRange: string;
  defaultKmStart: string;
  defaultKmEnd: string;
  availableSlots: number;
  loadPercent: number;
}

export const DIVISION_OPTIONS = [
  'Danapur Division (East Central Railway / ECR) - HQ: Danapur',
  'Pt. Deen Dayal Upadhyaya Division (ECR) - HQ: DDU',
  'Nagpur Division (Central Railway / CR) - HQ: Nagpur',
  'Sonpur Division (ECR) - HQ: Sonpur',
  'Samastipur Division (ECR) - HQ: Samastipur',
];

export const CORRIDOR_SECTION_METADATA: SectionMetadata[] = [
  {
    id: 'DNR_PNBE',
    division: 'Danapur Division (East Central Railway / ECR) - HQ: Danapur',
    label: 'Danapur – Patna Junction (UP MAIN)',
    shortName: 'Danapur–Patna',
    junctions: 'Danapur Jn ⇄ Phulwari Sharif ⇄ Patna Jn',
    kmRange: 'KM 135.00 – 148.50',
    defaultKmStart: '142.10',
    defaultKmEnd: '143.04',
    availableSlots: 4,
    loadPercent: 68,
  },
  {
    id: 'ARA_DNR',
    division: 'Danapur Division (East Central Railway / ECR) - HQ: Danapur',
    label: 'Ara Junction – Danapur (UP MAIN)',
    shortName: 'Ara–Danapur',
    junctions: 'Ara Jn ⇄ Kulharia ⇄ Koilwar ⇄ Bihta ⇄ Danapur',
    kmRange: 'KM 102.00 – 135.00',
    defaultKmStart: '114.50',
    defaultKmEnd: '116.20',
    availableSlots: 3,
    loadPercent: 74,
  },
  {
    id: 'BXR_ARA',
    division: 'Danapur Division (East Central Railway / ECR) - HQ: Danapur',
    label: 'Buxar – Ara Junction (UP MAIN)',
    shortName: 'Buxar–Ara',
    junctions: 'Buxar ⇄ Dumraon ⇄ Bihiya ⇄ Ara Jn',
    kmRange: 'KM 58.00 – 102.00',
    defaultKmStart: '72.30',
    defaultKmEnd: '74.10',
    availableSlots: 5,
    loadPercent: 52,
  },
  {
    id: 'DDU_BXR',
    division: 'Pt. Deen Dayal Upadhyaya Division (ECR) - HQ: DDU',
    label: 'Pt. Deen Dayal Upadhyaya – Buxar (DN MAIN)',
    shortName: 'DDU–Buxar',
    junctions: 'DDU Jn ⇄ Kuchman ⇄ Dildarnagar Jn ⇄ Buxar',
    kmRange: 'KM 0.00 – 58.00',
    defaultKmStart: '18.40',
    defaultKmEnd: '20.80',
    availableSlots: 2,
    loadPercent: 82,
  },
  {
    id: 'NGP_WDA',
    division: 'Nagpur Division (Central Railway / CR) - HQ: Nagpur',
    label: 'Nagpur – Wardha Corridor (Nagpur Division / CR)',
    shortName: 'Nagpur–Wardha',
    junctions: 'Nagpur Jn ⇄ Butibori ⇄ Sindi ⇄ Sevagram ⇄ Wardha Jn',
    kmRange: 'KM 758.00 – 836.50',
    defaultKmStart: '780.00',
    defaultKmEnd: '782.50',
    availableSlots: 3,
    loadPercent: 61,
  },
];

export const TRACK_OPTIONS = [
  {
    id: 'UP_MAIN' as const,
    label: 'UP MAIN',
    direction: 'Up Direction (Towards Patna / Howrah)',
    sublabel: 'Through Main Line • High-Speed Trunk Corridor',
    badge: 'UP DIR',
  },
  {
    id: 'DN_MAIN' as const,
    label: 'DN MAIN',
    direction: 'Down Direction (Towards DDU / Delhi)',
    sublabel: 'Through Main Line • High-Speed Trunk Corridor',
    badge: 'DN DIR',
  },
  {
    id: 'LOOP_01' as const,
    label: 'LOOP 01',
    direction: 'Platform Loop / Yard Line',
    sublabel: 'Auxiliary Loop • Crossover Padlock Req.',
    badge: 'LOOP',
  },
  {
    id: 'YARD_04' as const,
    label: 'YARD 04',
    direction: 'Freight Siding & Marshalling Yard',
    sublabel: 'Freight Yard • Isolated Shunting Neck',
    badge: 'YARD',
  },
];

export const INITIAL_FORM_DATA: WorkRequestFormData = {
  division: 'Danapur Division (East Central Railway / ECR) - HQ: Danapur',
  sectionId: 'DNR_PNBE',
  sectionLabel: 'Danapur – Patna Junction',
  trackId: 'UP_MAIN',
  kmStart: '142.10',
  kmEnd: '143.04',
  workDate: new Date().toISOString().split('T')[0],
  startTime: '14:00',
  endTime: '18:00',
  powerTrip: true,
  trafficBlock: true,
  speedRestriction: true,
  pointClamping: true,
  department: 'OHE',
  supervisorName: 'Vikramaditya Rao',
  supervisorDesignation: 'Senior Section Engineer (SSE / TRD / Danapur)',
  description: 'OHE Catenary Inspection, Contact Wire dropper adjustment and cantilever renewal as per ACTM Vol II Sec 20615.',
  teamSize: '8',
  contactNumber: '+91 94318 02441',
  idempotencyKey: '',
  step: 1,
};

