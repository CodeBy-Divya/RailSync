export interface EmergencyContact {
  id: string;
  title: string;
  number: string;
  telUri: string;
  department: string;
  description: string;
  isNationalHelpline?: boolean;
}

export interface EscalationLevel {
  level: number;
  title: string;
  designation: string;
  contact: string;
  telUri: string;
  responseTime: string;
  responsibilities: string;
}

export interface SupportContact {
  id: string;
  name: string;
  designation: string;
  department: 'OPERATING' | 'OHE' | 'S_AND_T' | 'CIVIL_P_WAY' | 'MECHANICAL_CW' | 'SAFETY';
  section: string;
  extension: string;
  phone: string;
  isOnDuty: boolean;
  avatarInitials: string;
  dutyShift?: string;
}

export interface HelpGuide {
  id: string;
  title: string;
  category: 'Work Request' | 'Rules & Regulations' | 'Emergency & Safety' | 'Features';
  summary: string;
  content: string[];
  referenceCode?: string;
}

// ── Emergency & Hotlines ─────────────────────────────────
export const EMERGENCY_HOTLINES: EmergencyContact[] = [
  {
    id: 'dcc-main',
    title: 'Division Control Center (DCC)',
    number: 'Danapur Ext. 4022',
    telUri: 'tel:+916122584022',
    department: 'OPERATING',
    description: '24x7 Centralized Railway Emergency & Section Dispatch Desk',
  },
  {
    id: 'sc-desk',
    title: 'Section Controller Desk',
    number: 'Ext. 4015',
    telUri: 'tel:+916122584015',
    department: 'OPERATING',
    description: 'Line clear, speed restrictions & path pacing',
  },
  {
    id: 'tpc-desk',
    title: 'Traction Power Controller (TPC)',
    number: 'Ext. 4030',
    telUri: 'tel:+916122584030',
    department: 'OHE',
    description: '25kV catenary isolation, sub-station CB trips & ETR-1',
  },
  {
    id: 'sm-pnbe',
    title: 'Station Master (Patna Jn / PNBE)',
    number: 'Ext. 4050',
    telUri: 'tel:+916122584050',
    department: 'OPERATING',
    description: 'Platform line possession, point clamps & physical padlocks',
  },
  {
    id: 'rail-madad',
    title: 'Rail Madad / Integrated Helpline',
    number: '139',
    telUri: 'tel:139',
    department: 'SAFETY',
    description: 'National single-window railway grievances & medical aid',
    isNationalHelpline: true,
  },
  {
    id: 'rpf-helpline',
    title: 'RPF Security Helpline',
    number: '182',
    telUri: 'tel:182',
    department: 'SAFETY',
    description: 'Railway Protection Force emergency response & track trespass',
    isNationalHelpline: true,
  },
];

// ── Escalation Matrix ────────────────────────────────────
export const ESCALATION_MATRIX: EscalationLevel[] = [
  {
    level: 1,
    title: 'Operational Level',
    designation: 'Station Master / Section Controller',
    contact: 'Ext. 4015 / 4050',
    telUri: 'tel:+916122584015',
    responseTime: '< 5 minutes',
    responsibilities: 'Initial track block coordination, local point clamping, emergency memo validation.',
  },
  {
    level: 2,
    title: 'Supervisory Level',
    designation: 'Chief Section Controller (CHC)',
    contact: 'Ext. 4018',
    telUri: 'tel:+916122584018',
    responseTime: '< 15 minutes',
    responsibilities: 'Corridor rescheduling, train diversion path margins, inter-divisional exchange.',
  },
  {
    level: 3,
    title: 'Divisional Executive Level',
    designation: 'Sr. DOM / Divisional Control Officer',
    contact: 'Ext. 4001',
    telUri: 'tel:+916122584001',
    responseTime: '< 30 minutes',
    responsibilities: 'Statutory executive overrides, major derailment/breakdown mobilization, NDRF coordination.',
  },
];

// ── Employee Directory (Clearly marked demo data) ────────
export const DIRECTORY_CONTACTS: SupportContact[] = [
  {
    id: 'cnt-01',
    name: 'Divya Singh',
    designation: 'Station Master (Junction In-Charge)',
    department: 'OPERATING',
    section: 'Patna Jn (PNBE)',
    extension: 'Ext. 4050',
    phone: '+91 94318 04050',
    isOnDuty: true,
    avatarInitials: 'DS',
    dutyShift: '06:00 - 14:00 (Shift A)',
  },
  {
    id: 'cnt-02',
    name: 'Anand Kishore',
    designation: 'Traction Power Controller (TPC)',
    department: 'OHE',
    section: 'Danapur Grid Substation',
    extension: 'Ext. 4030',
    phone: '+91 94318 04030',
    isOnDuty: true,
    avatarInitials: 'AK',
    dutyShift: '08:00 - 16:00 (General)',
  },
  {
    id: 'cnt-03',
    name: 'P. K. Verma',
    designation: 'Chief Section Controller (Chg)',
    department: 'OPERATING',
    section: 'Divisional Control Office, Danapur',
    extension: 'Ext. 4015',
    phone: '+91 94318 04015',
    isOnDuty: true,
    avatarInitials: 'PV',
    dutyShift: '08:00 - 16:00 (Shift A)',
  },
  {
    id: 'cnt-04',
    name: 'Devendra Kumar',
    designation: 'Senior Section Engineer (OHE)',
    department: 'OHE',
    section: 'Danapur–Ara Yard Section',
    extension: 'Ext. 4124',
    phone: '+91 94318 04124',
    isOnDuty: true,
    avatarInitials: 'DK',
    dutyShift: '06:00 - 14:00 (Field)',
  },
  {
    id: 'cnt-05',
    name: 'Sunil Sahay',
    designation: 'Senior Section Engineer (Signal)',
    department: 'S_AND_T',
    section: 'Danapur Relay Room',
    extension: 'Ext. 4210',
    phone: '+91 94318 04210',
    isOnDuty: true,
    avatarInitials: 'SS',
    dutyShift: '07:00 - 15:00',
  },
  {
    id: 'cnt-06',
    name: 'M. P. Singh',
    designation: 'Senior Section Engineer (P-Way)',
    department: 'CIVIL_P_WAY',
    section: 'Patna–Buxar Main Line',
    extension: 'Ext. 4315',
    phone: '+91 94318 04315',
    isOnDuty: false,
    avatarInitials: 'MS',
    dutyShift: 'Off-duty (Standby on call)',
  },
  {
    id: 'cnt-07',
    name: 'Rajesh Ranjan',
    designation: 'Divisional Safety Officer (DSO)',
    department: 'SAFETY',
    section: 'DRM Office, Danapur',
    extension: 'Ext. 4008',
    phone: '+91 94318 04008',
    isOnDuty: true,
    avatarInitials: 'RR',
    dutyShift: '09:30 - 18:00',
  },
  {
    id: 'cnt-08',
    name: 'B. N. Mishra',
    designation: 'TXR In-Charge (Carriage & Wagon)',
    department: 'MECHANICAL_CW',
    section: 'Patna Coaching Yard',
    extension: 'Ext. 4402',
    phone: '+91 94318 04402',
    isOnDuty: false,
    avatarInitials: 'BM',
    dutyShift: 'Off-duty (Rotational)',
  },
];

// ── Searchable Help & Guides ─────────────────────────────
export const HELP_GUIDES: HelpGuide[] = [
  {
    id: 'guide-01',
    title: 'How to create a Work Request',
    category: 'Work Request',
    summary: 'A 4-step wizard to requisition statutory track blocks with safety impact verification.',
    referenceCode: 'SOP-WR-01',
    content: [
      'Click the "+ Work Request" button in the top navigation bar from any screen.',
      'Step 1 (Location): Choose the railway section, track ID (Up Main, Down Main, Loop), and chainage (KM Start to KM End).',
      'Step 2 (Time & Safety): Specify the planned duration, power cut requirements, speed restrictions, and points padlocking needs.',
      'Step 3 (Team & Work): Assign the Site Engineer in charge, gang size, and machine rake deployment (e.g. CSM-952).',
      'Step 4 (Review & Submit): Review the 7-stage plan generated per Indian Railways operating manual, then press "Submit Request".',
      'Your request is cryptographically signed and routed to the Pending Approvals tab for dual-key quorum authorization.',
    ],
  },
  {
    id: 'guide-02',
    title: 'What happens after I send a Work Request (7-stage approval plan)',
    category: 'Work Request',
    summary: 'Understanding the statutory lifecycle of an Indian Railways track possession memo.',
    referenceCode: 'G&SR-FSM-07',
    content: [
      'Stage 1 (Draft): Memo drafted by site engineer with impact vector calculation.',
      'Stage 2 (Submitted): Dispatched to Section Control & Station Master queue.',
      'Stage 3 (Dependency Resolved): Automatic verification against live timetables, opposing trains, and catenary feeding posts.',
      'Stage 4 (Awaiting Approval): Dual-key quorum sign-offs: TPC (Power), Section Controller (Traffic), and Station Master (Ground).',
      'Stage 5 (Approved): Fencing token issued, line possession authorized for occupancy.',
      'Stage 6 (Active on Track): Field crew & tamping machines operating on track; live countdown active.',
      'Stage 7 (Normalized): Track fit certificate signed, physical point padlocks removed, 25kV catenary re-energized.',
    ],
  },
  {
    id: 'guide-03',
    title: 'What is ETR-1 (power block) and ETR-3 (field work permit with earthing rods)',
    category: 'Rules & Regulations',
    summary: 'Statutory electrical safety permits required before crew touches 25kV catenary.',
    referenceCode: 'ACTM-VOL-II',
    content: [
      'ETR-1 (Electrical Traction Requisition 1): Form issued by the Traction Power Controller (TPC) certifying that the feeding post circuit breaker has tripped and the 25kV catenary line is dead.',
      'ETR-3 (Field Work Permit): Issued to the site supervisor once physical earthing discharge rods are clamped on both sides of the work zone (minimum 200m separation) to prevent induced voltage injuries.',
      'Under G&SR rules, work must never commence on or adjacent to OHE without both ETR-1 clearance and ETR-3 physical earthing verification.',
    ],
  },
  {
    id: 'guide-04',
    title: 'G&SR 15.06 line possession explained',
    category: 'Rules & Regulations',
    summary: 'General & Subsidiary Rules on absolute block protection and signals to danger.',
    referenceCode: 'G&SR-15.06',
    content: [
      'G&SR 15.06 dictates that no maintenance work that interferes with the safe passage of trains shall be commenced without obtaining prior statutory track possession.',
      'Signals protecting the block section must be held at "ON" (Red Danger) position and signal slides must be padlocked or locked through electronic interlocking route inhibitions.',
      'Detonating fog signals and red banner flags must be erected at a prescribed distance (minimum 1200m) in the direction of approaching traffic.',
    ],
  },
  {
    id: 'guide-05',
    title: 'G&SR 15.09 co-utilization / piggyback explained',
    category: 'Rules & Regulations',
    summary: 'Permitting secondary departments (S&T, Civil) to execute work under an existing block.',
    referenceCode: 'G&SR-15.09',
    content: [
      'G&SR 15.09 allows secondary engineering wings (such as S&T signal maintenance) to "piggyback" on a primary civil or OHE track possession block.',
      'Conditions: The secondary work must not exceed the sanctioned block duration of the primary department, and must not compromise safety precautions.',
      'In RailSync, you can click "Add Department Piggyback" in the detail pane to record secondary departmental work with joint legal sign-offs.',
    ],
  },
  {
    id: 'guide-06',
    title: 'How to use Re-approve & Resume Work after an Emergency Stop',
    category: 'Emergency & Safety',
    summary: 'Step-by-step restoration of suspended track blocks following an executive safety halt.',
    referenceCode: 'SOP-EMG-04',
    content: [
      'When an Emergency Stop is triggered, all ongoing track blocks are immediately suspended and moved into the "Pending Approvals" tab with red suspended badges.',
      'Single Work Resumption: Select the suspended work card in the Pending Approvals tab, click "Re-approve & Resume Work" in the detail panel.',
      'Bulk Work Resumption: Click the blue "Re-approve all suspended (N)" button located at the top of the Pending Approvals queue, then confirm in the modal.',
      'Result: All red suspension banners disappear, estimated completion times are extended by the pause duration, and track possession is restored with active green/red status.',
    ],
  },
  {
    id: 'guide-07',
    title: 'How to send photos and voice-to-text in Messages',
    category: 'Features',
    summary: 'Using the two-way control desk clarification chat with voice dictation and camera proof.',
    referenceCode: 'USER-MSG-02',
    content: [
      'Voice Dictation: Click the microphone icon in the bottom composer. Speak in English or Hindi (toggle using the EN / HI button). Text appears in real time and can be edited before pressing Send.',
      'Photo Evidence: Click the Camera icon on the left of the composer, then choose "Take Photo" (using device camera) or "Choose from Gallery".',
      'Geotag Watermark: Attached photos are compressed automatically and stamped with GPS coordinates, KM chainage, and UTC timestamp.',
      'Department Tagging: Click any tag chip (@OPERATING, @OHE, @S_AND_T, @CIVIL_P_WAY) to route your query directly to that control desk channel.',
    ],
  },
  {
    id: 'guide-08',
    title: 'What is the Geofence / GPS photo proof',
    category: 'Features',
    summary: 'Ensuring site engineers are physically on the ground at the designated chainage.',
    referenceCode: 'TECH-GEO-01',
    content: [
      'To prevent unauthorized remote approvals, site inspection photos captured through the RailSync Mobile client require GPS location tagging.',
      'The system calculates the geodesic distance from the track center line (KM chainage).',
      'A photo verified within 50 meters of the sanctioned track block boundary receives an immutable cryptographic hash that is stored in the statutory audit ledger.',
    ],
  },
];

// ── Application Metadata ─────────────────────────────────
export const APP_METADATA = {
  appName: 'RailSync Digital Track Possession & SRE Suite',
  version: 'v2.4.2-ECR.PROD',
  division: 'East Central Railway (Danapur Division)',
  headquarters: 'Hajipur / Danapur (DNR)',
  lastUpdated: 'October 24, 2026',
  legalStandard: 'Indian Railways General & Subsidiary Rules (G&SR) 2020',
};
