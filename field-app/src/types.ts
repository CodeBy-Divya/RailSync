export type EventStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'DEPENDENCY_RESOLVED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'ACTIVE_IN_PROGRESS'
  | 'WORK_COMPLETED'
  | 'SAFETY_VERIFIED'
  | 'BLOCK_CLEARED'
  | 'AUDIT_LOCKED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'ESCALATED_SLA'
  | 'ABORTED_SAFETY_LOCK';

export type Department =
  | 'OPERATING'
  | 'OHE'
  | 'CIVIL_P_WAY'
  | 'S_AND_T'
  | 'MECHANICAL_CW'
  | 'SAFETY';

export type ApprovalRole =
  | 'TPC'
  | 'SECTION_CONTROLLER'
  | 'STATION_MASTER'
  | 'FIELD_SUPERVISOR'
  | 'SAFETY_OFFICER';

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
  fsm_stage: number;
  status_color?: string;
  created_at: string;
  updated_at: string;
  field_photo?: FieldPhotoProof;
  is_suspended?: boolean;
}

export interface TaskProposalPayload {
  division: string;
  section: string;
  track_id: string;
  km_start: number;
  km_end: number;
  requested_start: string;
  requested_end: string;
  impact_vector: ImpactVector;
  description: string;
  originator_id: string;
}
