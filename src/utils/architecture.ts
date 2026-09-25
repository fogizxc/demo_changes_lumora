export type BusinessArchitecture = 'HEALTHCARE' | 'GYM' | 'RESTAURANT' | 'RENTAL' | 'REPAIR' | 'RETAIL';

export function getShopArchitecture(shopType?: string): BusinessArchitecture {
  if (!shopType) return 'RETAIL';
  const s = shopType.toLowerCase().trim();
  if (s.includes('health') || s.includes('hospital') || s.includes('clinic') || s.includes('medical') || s.includes('doctor')) {
    return 'HEALTHCARE';
  }
  if (s.includes('gym') || s.includes('fitness') || s.includes('workout') || s.includes('athletic')) {
    return 'GYM';
  }
  if (s.includes('rest') || s.includes('din') || s.includes('cafe') || s.includes('food') || s.includes('bar') || s.includes('bistro')) {
    return 'RESTAURANT';
  }
  if (s.includes('rent') || s.includes('fleet') || s.includes('vehicle') || s.includes('equipment') || s.includes('hire')) {
    return 'RENTAL';
  }
  if (s.includes('repair') || s.includes('service') || s.includes('workshop') || s.includes('fix') || s.includes('techfix')) {
    return 'REPAIR';
  }
  return 'RETAIL';
}

export interface ArchitectureMeta {
  key: BusinessArchitecture;
  label: string;
  badgeLabel: string;
  portalTitle: string;
  managerRole: string;
  defaultShopType: string;
  iconEmoji: string;
  tagline: string;
  summary: string;
}

export const ARCHITECTURES: Record<BusinessArchitecture, ArchitectureMeta> = {
  HEALTHCARE: {
    key: 'HEALTHCARE',
    label: 'Hospital & Healthcare Clinic',
    badgeLabel: 'Hospital & Clinic',
    portalTitle: 'Hospital Operations & OPD Portal',
    managerRole: 'Medical Director / Clinic Admin',
    defaultShopType: 'healthcare',
    iconEmoji: '🏥',
    tagline: 'Patient EHR, Clinical Consultations & Doctor Scheduling',
    summary: 'Restricted purely to appointments, patient records, prescriptions, and specialist chambers. No retail or food options.',
  },
  GYM: {
    key: 'GYM',
    label: 'Gym & Fitness Athletic Club',
    badgeLabel: 'Fitness & Gym',
    portalTitle: 'Gym Club & Member Check-in Portal',
    managerRole: 'Club General Manager',
    defaultShopType: 'gym',
    iconEmoji: '🏋️',
    tagline: 'Turnstile Access, Tier Memberships & Freeze Guards',
    summary: 'Restricted purely to active members, live turnstile check-ins, tier plans, and trainer assignments.',
  },
  RESTAURANT: {
    key: 'RESTAURANT',
    label: 'Restaurant, Cafe & Dining Lounge',
    badgeLabel: 'Restaurant & Dining',
    portalTitle: 'Restaurant & Kitchen KOT Portal',
    managerRole: 'Maitre D / Floor Manager',
    defaultShopType: 'restaurant',
    iconEmoji: '🍽️',
    tagline: 'Table Floor Plan, Live Kitchen Tickets & Dining Billing',
    summary: 'Restricted purely to live table floor statuses (Vacant/Seated/Billing), real-time KOT display, and dining food billing.',
  },
  RENTAL: {
    key: 'RENTAL',
    label: 'Equipment Rental & Fleet Hire',
    badgeLabel: 'Equipment & Fleet',
    portalTitle: 'Rental Fleet & Overlap Guard Portal',
    managerRole: 'Fleet Operations Director',
    defaultShopType: 'rental',
    iconEmoji: '🚗',
    tagline: 'Asset Fleet, Date Overlap Protection & Security Deposits',
    summary: 'Restricted purely to asset fleet tracking, reservation conflict detection, damage check inspections, and deposit refunds.',
  },
  REPAIR: {
    key: 'REPAIR',
    label: 'Electronics Repair & Service Lab',
    badgeLabel: 'Repair & Tech Lab',
    portalTitle: 'Repair Workshop & Diagnostics Portal',
    managerRole: 'Chief Service Engineer',
    defaultShopType: 'repair',
    iconEmoji: '🔧',
    tagline: 'Device Intake, Diagnostic Pipeline & Spare Parts Stock',
    summary: 'Restricted purely to device repair job cards, fault diagnostics pipeline, technician assignments, and parts billing.',
  },
  RETAIL: {
    key: 'RETAIL',
    label: 'Grocery Store & Supermarket',
    badgeLabel: 'Grocery & Retail POS',
    portalTitle: 'Grocery Mart & Cashier POS Portal',
    managerRole: 'Store Operations Manager',
    defaultShopType: 'retail',
    iconEmoji: '🛒',
    tagline: 'Barcode Cashier POS Till, Inventory & Supplier Orders',
    summary: 'Restricted purely to retail supermarket billing, barcode product catalog, inventory stock movements, and supplier procurement.',
  },
};
