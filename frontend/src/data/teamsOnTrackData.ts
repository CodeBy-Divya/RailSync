export interface TeamMember {
  name: string;
  role: string;
  department: string;
  status: 'On Site' | 'Working' | 'Completed';
}

export interface TeamNotification {
  id: string;
  type:
    | 'Work Started'
    | 'Work Progressed'
    | 'Work Delayed'
    | 'Safety Check Completed'
    | 'Work Completed'
    | 'Requisition Dispatched'
    | 'Sealed Historical Block';
  remarks: string;
  user: string;
  timestamp: string;
  progress_percent?: number;
}

export interface TeamProfile {
  team_id: string;
  work_request_id: string;
  team_leader_name: string;
  team_leader_designation: string;
  je_name: string;
  department: string;
  status: 'Not Started' | 'In Progress' | 'Delayed' | 'Completed';
  current_stage: string;
  progress_percent: number;
  last_updated: string;
  members: TeamMember[];
  notifications: TeamNotification[];
}

export const INITIAL_TEAM_PROFILES: Record<string, TeamProfile> = {
  // ── ONGOING TRACK BLOCK 1: Danapur–Patna Junction (UP MAIN) ──
  'EVT-ENG-2026-00109': {
    team_id: 'TEAM-PWAY-DNR-01',
    work_request_id: 'WR-2026-PWAY-9102',
    team_leader_name: 'Rajesh Kumar',
    team_leader_designation: 'Senior Section Engineer (SSE / P-Way / Danapur)',
    je_name: 'Amit Sharma (Junior Engineer / P-Way)',
    department: 'CIVIL_P_WAY',
    status: 'In Progress',
    current_stage: 'Stage 6: Permit Form3-PTW Active • Track Machine On Site',
    progress_percent: 65,
    last_updated: '2026-10-16T12:15:00Z',
    members: [
      { name: 'Rajesh Kumar', role: 'Senior Section Engineer (SSE)', department: 'CIVIL_P_WAY', status: 'Working' },
      { name: 'Amit Sharma', role: 'Junior Engineer (JE)', department: 'CIVIL_P_WAY', status: 'Working' },
      { name: 'Rameshwar Singh', role: 'Track Machine Operator (CSM-952)', department: 'CIVIL_P_WAY', status: 'Working' },
      { name: 'Dilip Paswan', role: 'Keyman / Lookout Patrol', department: 'CIVIL_P_WAY', status: 'On Site' },
      { name: 'Surendra Prasad', role: 'Track Maintainer Gr-I', department: 'CIVIL_P_WAY', status: 'Working' },
      { name: 'Mohan Lal', role: 'Track Maintainer Gr-II', department: 'CIVIL_P_WAY', status: 'Working' },
      { name: 'Sanjay Kumar', role: 'Safety Lookout / Detonator Bearer', department: 'CIVIL_P_WAY', status: 'On Site' },
    ],
    notifications: [
      {
        id: 'NOTIF-109-03',
        type: 'Work Progressed',
        remarks: '1,200m track profile completed between KM 154.20–155.40. Ballast tamping frequency 35 Hz nominal.',
        user: 'Rajesh Kumar (SSE/P-Way)',
        timestamp: '2026-10-16T12:15:00Z',
        progress_percent: 65,
      },
      {
        id: 'NOTIF-109-02',
        type: 'Work Started',
        remarks: 'CSM-952 tamping unit occupied UP MAIN at KM 154.00. Track possession active under Form3.',
        user: 'Rajesh Kumar (SSE/P-Way)',
        timestamp: '2026-10-16T11:05:00Z',
        progress_percent: 30,
      },
      {
        id: 'NOTIF-109-01',
        type: 'Requisition Dispatched',
        remarks: 'Track block requisition authorized by Station Master Patna Jn (SM_PNBE_01). Up Main isolated.',
        user: 'SM_PNBE_01 (Station Master Desk)',
        timestamp: '2026-10-16T10:55:00Z',
        progress_percent: 10,
      },
    ],
  },

  // ── ONGOING TRACK BLOCK 2: Ara–Danapur (UP MAIN) ──
  'EVT-OHE-2026-00104': {
    team_id: 'TEAM-OHE-ARA-04',
    work_request_id: 'WR-2026-OHE-8842',
    team_leader_name: 'Vikramaditya Rao',
    team_leader_designation: 'Senior Section Engineer (SSE / TRD / Danapur)',
    je_name: 'Sunil Verma (Junior Engineer / TRD)',
    department: 'OHE',
    status: 'In Progress',
    current_stage: 'Stage 6: Permit Form3-PTW Active • 25kV Earthing Grounded',
    progress_percent: 50,
    last_updated: '2026-10-16T12:35:00Z',
    members: [
      { name: 'Vikramaditya Rao', role: 'Senior Section Engineer (SSE / TRD)', department: 'OHE', status: 'Working' },
      { name: 'Sunil Verma', role: 'Junior Engineer (JE / TRD)', department: 'OHE', status: 'Working' },
      { name: 'Arvind Kumar', role: 'OHE Lineman Gr-I', department: 'OHE', status: 'Working' },
      { name: 'Rakesh Roshan', role: 'Tower Wagon Driver (DETC-04)', department: 'OHE', status: 'On Site' },
      { name: 'Mohammad Ansari', role: 'Earthing Discharge Technician', department: 'OHE', status: 'Working' },
      { name: 'Pradeep Yadav', role: 'OHE Fitter / Dropper Rigger', department: 'OHE', status: 'Working' },
    ],
    notifications: [
      {
        id: 'NOTIF-104-03',
        type: 'Work Progressed',
        remarks: 'Contact wire splicing sleeve crimped at KM 141.65. Dropper tensioning and height check in progress.',
        user: 'Vikramaditya Rao (SSE/TRD)',
        timestamp: '2026-10-16T12:35:00Z',
        progress_percent: 50,
      },
      {
        id: 'NOTIF-104-02',
        type: 'Work Started',
        remarks: 'Tower Wagon DETC-04 deployed at KM 141.20. Discharge earthing rods secured to traction rails.',
        user: 'Vikramaditya Rao (SSE/TRD)',
        timestamp: '2026-10-16T11:35:00Z',
        progress_percent: 25,
      },
      {
        id: 'NOTIF-104-01',
        type: 'Requisition Dispatched',
        remarks: '25kV Power cut authorized by TPC DDU desk at Feeding Post FP-04. 2 earth rods locked.',
        user: 'TPC_DDU_01 (Traction Power Controller)',
        timestamp: '2026-10-16T11:30:00Z',
        progress_percent: 10,
      },
    ],
  },

  // ── ONGOING TRACK BLOCK 3: Buxar–Ara Junction (DN MAIN) ──
  'EVT-SIG-2026-00114': {
    team_id: 'TEAM-SIG-ARA-02',
    work_request_id: 'WR-2026-SIG-7719',
    team_leader_name: 'K. S. Narayanan',
    team_leader_designation: 'Senior Section Engineer (SSE / Signals / Ara)',
    je_name: 'Pankaj Mishra (Junior Engineer / Telecom)',
    department: 'S_AND_T',
    status: 'In Progress',
    current_stage: 'Stage 6: Electronic Interlocking Disconnection Active',
    progress_percent: 40,
    last_updated: '2026-10-16T12:45:00Z',
    members: [
      { name: 'K. S. Narayanan', role: 'Senior Section Engineer (SSE / Signals)', department: 'S_AND_T', status: 'Working' },
      { name: 'Pankaj Mishra', role: 'Junior Engineer (JE / Telecom)', department: 'S_AND_T', status: 'Working' },
      { name: 'Satyendra Nath', role: 'Electronic Signal Maintainer (ESM Gr-I)', department: 'S_AND_T', status: 'Working' },
      { name: 'Manoj Baski', role: 'Telecommunication Technician', department: 'S_AND_T', status: 'On Site' },
      { name: 'Vijay Kumar', role: 'Axle Counter Sensor Specialist', department: 'S_AND_T', status: 'Working' },
    ],
    notifications: [
      {
        id: 'NOTIF-114-03',
        type: 'Safety Check Completed',
        remarks: 'High-frequency wheel sensor signal calibration verified at 21.4 kHz on DN MAIN track section.',
        user: 'K. S. Narayanan (SSE/Signals)',
        timestamp: '2026-10-16T12:45:00Z',
        progress_percent: 40,
      },
      {
        id: 'NOTIF-114-02',
        type: 'Work Started',
        remarks: 'Dual SSDAC axle counter head unbolted at KM 118.40. Sensor lead cables clamped in isolation.',
        user: 'K. S. Narayanan (SSE/Signals)',
        timestamp: '2026-10-16T12:05:00Z',
        progress_percent: 20,
      },
      {
        id: 'NOTIF-114-01',
        type: 'Requisition Dispatched',
        remarks: 'S&T Disconnection notice accepted by Station Master Ara Junction. Track circuit clamped.',
        user: 'SM_ARA_01 (Station Master Desk)',
        timestamp: '2026-10-16T11:58:00Z',
        progress_percent: 10,
      },
    ],
  },

  // ── ONGOING TRACK BLOCK 4: Pt. Deen Dayal Upadhyaya–Buxar (UP MAIN) ──
  'EVT-PWY-2026-00116': {
    team_id: 'TEAM-PWAY-DDU-02',
    work_request_id: 'WR-2026-PWAY-6551',
    team_leader_name: 'Harpreet Singh Dhillon',
    team_leader_designation: 'Senior Section Engineer (SSE / Bridges / DDU)',
    je_name: 'Anand Kishor (Junior Engineer / P-Way)',
    department: 'CIVIL_P_WAY',
    status: 'In Progress',
    current_stage: 'Stage 6: Bridge Possession Active • TSR 30 km/h Enforced',
    progress_percent: 75,
    last_updated: '2026-10-16T12:50:00Z',
    members: [
      { name: 'Harpreet Singh Dhillon', role: 'Senior Section Engineer (SSE / Bridges)', department: 'CIVIL_P_WAY', status: 'Working' },
      { name: 'Anand Kishor', role: 'Junior Engineer (JE / P-Way)', department: 'CIVIL_P_WAY', status: 'Working' },
      { name: 'Gurmukh Singh', role: 'Bridge Mason / Structural Fitter', department: 'CIVIL_P_WAY', status: 'Working' },
      { name: 'Tufail Ahmed', role: 'Concrete Vibrator Operator', department: 'CIVIL_P_WAY', status: 'Working' },
      { name: 'Rajeshwar Rai', role: 'Trackman / Fastening Rigger', department: 'CIVIL_P_WAY', status: 'Working' },
      { name: 'Naresh Mahto', role: 'Flagman / Warning Whistle', department: 'CIVIL_P_WAY', status: 'On Site' },
    ],
    notifications: [
      {
        id: 'NOTIF-116-03',
        type: 'Work Progressed',
        remarks: 'M35 grade concrete poured on east ballast retaining wall abutment. Rail clips tightened to 1,200 kgf.',
        user: 'Harpreet Singh Dhillon (SSE/Bridges)',
        timestamp: '2026-10-16T12:50:00Z',
        progress_percent: 75,
      },
      {
        id: 'NOTIF-116-02',
        type: 'Work Started',
        remarks: 'Scaffolding erected on Bridge #38 Up Main. Pre-cast retaining wall shuttering in place.',
        user: 'Harpreet Singh Dhillon (SSE/Bridges)',
        timestamp: '2026-10-16T10:35:00Z',
        progress_percent: 35,
      },
      {
        id: 'NOTIF-116-01',
        type: 'Requisition Dispatched',
        remarks: 'Bridge block requisition signed by Section Controller and Station Master DDU.',
        user: 'CTRL_SEC_DNR_02 (Section Controller)',
        timestamp: '2026-10-16T10:25:00Z',
        progress_percent: 10,
      },
    ],
  },

  // ── HISTORICAL SEALED RECORDS (Retained for audit trail / lookup) ──
  'EVT-HIST-2026-00082': {
    team_id: 'TEAM-PWAY-DNR-03',
    work_request_id: 'WR-2026-PWAY-8840',
    team_leader_name: 'Rajesh Kumar',
    team_leader_designation: 'Senior Section Engineer (SSE / P-Way)',
    je_name: 'Amit Sharma (Junior Engineer / P-Way)',
    department: 'CIVIL_P_WAY',
    status: 'Completed',
    current_stage: 'Stage 7: Normalized & Fit for Traffic',
    progress_percent: 100,
    last_updated: '2026-10-12T18:30:00Z',
    members: [
      { name: 'Rajesh Kumar', role: 'Senior Section Engineer (SSE)', department: 'CIVIL_P_WAY', status: 'Completed' },
      { name: 'Amit Sharma', role: 'Junior Engineer (JE)', department: 'CIVIL_P_WAY', status: 'Completed' },
    ],
    notifications: [],
  },
};

export function getTeamProfile(eventId: string): TeamProfile {
  if (INITIAL_TEAM_PROFILES[eventId]) {
    return INITIAL_TEAM_PROFILES[eventId];
  }
  // Dynamic fallback for newly submitted work requests or unmapped events
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return {
    team_id: `TEAM-LINE-${eventId.replace(/[^A-Z0-9]/g, '').slice(-6)}`,
    work_request_id: `WR-${eventId}`,
    team_leader_name: 'Duty Site Supervisor',
    team_leader_designation: 'Senior Section Engineer (SSE)',
    je_name: 'On-Duty Junior Engineer (JE)',
    department: 'CIVIL_P_WAY',
    status: 'In Progress',
    current_stage: 'Stage 6: Permit Form3-PTW Active • Field Gang on Track',
    progress_percent: 55,
    last_updated: new Date().toISOString(),
    members: [
      { name: 'Duty Supervisor', role: 'Senior Section Engineer (SSE)', department: 'CIVIL_P_WAY', status: 'Working' },
      { name: 'Field Engineer', role: 'Junior Engineer (JE)', department: 'CIVIL_P_WAY', status: 'Working' },
      { name: 'Lead Gangman', role: 'Gang Mate', department: 'CIVIL_P_WAY', status: 'Working' },
      { name: 'Track Maintainer', role: 'Keyman / Lookout', department: 'CIVIL_P_WAY', status: 'On Site' },
    ],
    notifications: [
      {
        id: `NOTIF-${randNum}-01`,
        type: 'Work Started',
        remarks: `Live track block active on ${eventId}. Maintenance possession in progress.`,
        user: 'Duty Field Supervisor',
        timestamp: new Date().toISOString(),
        progress_percent: 55,
      },
    ],
  };
}
