// ============================================================================
// RailSync Unified Data Contract (Shared between Station Master & Field App)
// ============================================================================

export type WorkRequestSource = 'FIELD' | 'PORTAL';

export type EventStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'DEPENDENCY_RESOLVED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'ACTIVE_IN_PROGRESS'
  | 'ACTIVE_ON_TRACK'
  | 'WORK_COMPLETED'
  | 'SAFETY_VERIFIED'
  | 'BLOCK_CLEARED'
  | 'AUDIT_LOCKED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'SUSPENDED'
  | 'ESCALATED_SLA'
  | 'ABORTED_SAFETY_LOCK';

export type Department =
  | 'OPERATING'
  | 'OHE'
  | 'CIVIL_P_WAY'
  | 'S_AND_T'
  | 'MECHANICAL_CW'
  | 'SAFETY'
  | 'COMMERCIAL';

export type ApprovalRole =
  | 'TPC'
  | 'SECTION_CONTROLLER'
  | 'STATION_MASTER'
  | 'FIELD_SUPERVISOR'
  | 'SAFETY_OFFICER';

export type PhotoStage =
  | 'REQUEST_DEFECT'
  | 'BEFORE_WORK'
  | 'DURING_WORK'
  | 'AFTER_WORK';

export interface PhotoGps {
  lat: number;
  lng: number;
  accuracyM: number;
}

export interface WorkPhoto {
  id: string;
  workRequestId: string;
  url: string;
  thumbnailUrl?: string;
  capturedBy: string;
  capturedAt: string; // ISO string with UTC + IST reference
  gps: PhotoGps;
  chainage: string; // e.g. "KM 548.10 UP MAIN"
  geofenceStatus: 'MATCH VERIFIED' | 'MISMATCH' | 'UNKNOWN';
  crewPresent: number;
  caption?: string;
  stage: PhotoStage;
  sha256: string;
}

export interface SafetyImpacts {
  power25kvCut: boolean;
  trafficBlock: boolean;
  tsr30: boolean;
  pointClamp: boolean;
  trackBondingNotice?: boolean;
  feedingPosts?: string[];
}

export interface RoleApproval {
  signedBy?: string;
  signedAt?: string;
  signatureHash?: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}

export interface MultilateralApprovals {
  fieldSupervisor?: RoleApproval;
  tpc?: RoleApproval;
  stationMaster?: RoleApproval;
  sectionController?: RoleApproval;
}

export interface WorkSuspension {
  isSuspended: boolean;
  suspendedAt?: string;
  suspendedBy?: string;
  reason?: string;
  previousStatus?: EventStatus | string;
  previousFsmStage?: number;
}

export interface WorkRequestCreatedBy {
  id: string;
  name: string;
  role: string;
  department: Department | string;
}

export interface WorkRequest {
  id: string; // e.g. EVT-OHE-2026-001 or EVT-01
  source: WorkRequestSource;
  createdBy: WorkRequestCreatedBy;
  division: string;
  section: string;
  trackId: string; // 'UP_MAIN' | 'DOWN_MAIN' | 'REVERSE_LOOP' | 'LOOP' | 'YARD'
  kmStart: number;
  kmEnd: number;
  durationHours: number;
  dateOfWork: string;
  startTime: string;
  endTime: string;
  department: Department | string;
  supervisor: string;
  description: string;
  safetyImpacts: SafetyImpacts;
  status: EventStatus;
  fsmStage: number; // 1 to 7
  approvals: MultilateralApprovals;
  fencingToken: number | null; // 3 digits
  photos: WorkPhoto[];
  suspension?: WorkSuspension;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
  commencedAt?: string;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// OperationalEvent Compatibility Layer
// ---------------------------------------------------------------------------
export interface ImpactVector {
  catenary_25kv_power_trip: boolean;
  absolute_traffic_block: boolean;
  speed_restriction_kmh: number;
  feeding_posts: string[];
  points_clamping_required: boolean;
  track_bonding_notice: boolean;
}

export interface Stakeholder {
  id: string;
  event_id: string;
  department: Department;
  role: ApprovalRole;
  officer_id: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  signature_hash?: string;
  signed_at?: string;
  rejection_reason?: string;
}

export interface StatutoryPermit {
  id: string;
  event_id: string;
  permit_type: string;
  earthing_discharged: boolean;
  power_tripped: boolean;
  points_clamped: boolean;
  issued_at: string;
  officer_id: string;
  notes?: string;
}

export interface InvariantSummary {
  invariant_1_ambient_awareness: Array<{ role: string; post: string; action: string }>;
  invariant_2_statutory_approvers: Array<{ role: string; department: string; officer_id: string; authority_code: string; description: string }>;
  invariant_3_physical_prerequisites: Array<{ type: string; code: string; assigned_to: string; action: string }>;
  invariant_4_passive_monitoring: Array<{ desk: string; mode: string }>;
  invariant_5_site_custody: { title: string; officer_id: string; statutory_role: string };
  invariant_6_sla_escalation: Array<{ tier: number; threshold_minutes: number; escalate_to: string }>;
  conflict_free: boolean;
}

export interface FieldPhotoProof {
  photo_url: string;
  lat: number;
  lng: number;
  km_chainage: string;
  uploaded_at: string;
  accuracy_meters: number;
  geofence_verified: boolean;
  gang_supervisor: string;
  crew_count: number;
  sha256?: string;
  stage?: PhotoStage;
}

export interface PiggybackedDepartment {
  id: string;
  department: Department | string;
  work_description: string;
  supervisor_id: string;
  crew_size: number;
  joined_at: string;
}

export interface StationMasterActions {
  power_cut_granted: boolean;
  power_cut_granted_at?: string;
  traffic_block_granted: boolean;
  traffic_block_granted_at?: string;
  points_clamped_confirmed: boolean;
  points_clamped_at?: string;
}

export interface DigitalPermitMemo {
  permit_number: string;
  issued_by: string;
  station: string;
  issued_at: string;
  valid_until: string;
  delivered_to_mobile: boolean;
  acknowledged_by_field: boolean;
}

export interface OperationalEvent {
  id: string;
  division: string;
  section: string;
  track_id: string;
  km_start: number;
  km_end: number;
  status: EventStatus;
  requested_start: string;
  requested_end: string;
  fencing_token: number | null;
  impact_vector: ImpactVector;
  description: string;
  originator_id: string;
  stakeholders: Stakeholder[];
  permits: StatutoryPermit[];
  invariants?: InvariantSummary;
  fsm_stage: number;
  status_color?: string;
  lock_info?: any;
  created_at: string;
  updated_at: string;
  field_photo?: FieldPhotoProof;
  photos?: WorkPhoto[];
  piggybacked_depts?: PiggybackedDepartment[];
  station_actions?: StationMasterActions;
  digital_permit?: DigitalPermitMemo;
  is_suspended?: boolean;
  suspended_at?: string;
  suspended_by?: string;
  suspension_reason?: string;
  previous_status?: EventStatus | string;
  previous_fsm_stage?: number;
  source?: WorkRequestSource;
  created_by?: WorkRequestCreatedBy;
  assigned_by?: string;
  assigned_to?: string;
  assigned_dept?: string;
  department?: Department | string;
  is_work_request?: boolean;
}

// ---------------------------------------------------------------------------
// Messaging, Notifications, SOS, Audit Types
// ---------------------------------------------------------------------------
export interface SharedMessage {
  id: string;
  sender: string;
  role: string;
  text: string;
  timestamp: string;
  taggedDepts?: string[];
  photoUrl?: string;
  voiceUrl?: string;
  channel?: 'all' | 'operating' | 'ohe' | 'sandt' | 'civil';
}

export interface SharedNotification {
  id: string;
  type: 'WORK_CREATED' | 'WORK_APPROVED' | 'EMERGENCY_STOP' | 'SOS' | 'MESSAGE' | 'INFO';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  workRequestId?: string;
  gps?: PhotoGps;
}

export interface SosAlert {
  id: string;
  workRequestId?: string;
  supervisorName: string;
  supervisorId: string;
  department: string;
  section: string;
  trackId: string;
  chainage: string;
  gps: PhotoGps;
  timestamp: string;
  reason?: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
}

export interface AuditLeaf {
  leaf_id: string;
  title: string;
  hash: string;
  payload_summary?: string;
}

export interface AuditBlock {
  block_number: number;
  event_id: string;
  timestamp: string;
  prev_hash: string;
  merkle_root: string;
  block_hash: string;
  consensus_proof: string;
  multi_signatures: Array<{
    department: string;
    role?: string;
    officer_id?: string;
    signature_hash?: string;
    signed_at?: string;
  }>;
  leaves: AuditLeaf[];
  worm_status: string;
  storage_tier: string;
}

export interface SreMetrics {
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  throughput_req_min: number;
  error_rate_pct: number;
  cpu_utilization_pct: number;
  memory_utilization_pct: number;
}
