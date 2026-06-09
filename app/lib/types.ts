export type OrgType = 'hospital' | 'prison' | 'school' | 'temple' | 'library' | 'community_centre' | 'other';

export type OrderStatus = 'new' | 'funded' | 'delivered';

export interface Organisation {
  id: string;
  created_at: string;
  org_name: string;
  org_type: OrgType;
  address: string | null;
  postcode: string | null;
  lat: number | null;
  lon: number | null;
  phone: string | null;
  contact_person_1: string | null;
  contact_person_2: string | null;
  email_1: string | null;
  email_2: string | null;
  notes: string | null;
  deliveries_total: number;
}

export interface Order {
  id: string;
  created_at: string;
  organisation_id: string;
  target_amount_pence: number;
  pledged_amount_pence: number;
  status: OrderStatus;
  appeal_title: string;
  appeal_description: string | null;
  needed_by: string | null;
}

export interface Donation {
  id: string;
  created_at: string;
  order_id: string;
  amount_pence: number;
  donor_name: string | null;
  donor_email: string | null;
  gift_aid: boolean;
  stripe_session_id: string | null;
}

export interface OrganisationWithOrder extends Organisation {
  active_order: Order | null;
}

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  hospital: 'Hospital',
  prison: 'Prison',
  school: 'School',
  temple: 'Temple',
  library: 'Library',
  community_centre: 'Community Centre',
  other: 'Other',
};

export const ORG_TYPE_COLORS: Record<OrgType, string> = {
  hospital: '#2563eb',
  prison: '#dc2626',
  school: '#16a34a',
  temple: '#f59e0b',
  library: '#8b5cf6',
  community_centre: '#ec4899',
  other: '#6b7280',
};
