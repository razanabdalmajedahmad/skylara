/**
 * Demo Scenario Types & Realistic Data Generators
 *
 * Shared interfaces, constants, and helpers used by all scenario packs.
 * All data is production-realistic: real gear brands, real aircraft types,
 * believable names, valid tail numbers, and proper skydiving terminology.
 */

// ============================================================================
// SCENARIO METADATA
// ============================================================================

export interface ScenarioMeta {
  key: string;
  name: string;
  description: string;
  tags: string[];
  /** Estimated record count for preview */
  estimatedRecords: Record<string, number>;
}

export interface ScenarioData {
  meta: ScenarioMeta;
  organizations: OrgData[];
}

// ============================================================================
// ENTITY DATA INTERFACES (match Prisma create shapes)
// ============================================================================

export interface OrgData {
  name: string;
  slug: string;
  owner: UserData;
  dropzones: DropzoneData[];
}

export interface DropzoneData {
  name: string;
  slug: string;
  icaoCode?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  windLimitKnots: number;
  currency: string;
  branches: BranchData[];
  staff: StaffData[];
  athletes: AthleteData[];
  aircraft: AircraftData[];
  loads: LoadData[];
  gear: GearItemData[];
  rigs: RigData[];
  waiverTemplates: WaiverTemplateData[];
  bookingPackages: BookingPackageData[];
  incidents: IncidentData[];
  boogies: BoogieData[];
  jobPosts: JobPostData[];
  courses: CourseData[];
  campaigns: CampaignData[];
}

export interface BranchData {
  name: string;
  isDefault: boolean;
}

export interface UserData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface StaffData extends UserData {
  roles: string[];
  /** Additional profile data */
  bio?: string;
}

export interface AthleteData extends UserData {
  roles?: string[];
  jumpCount: number;
  licenseType?: string;
  licenseNumber?: string;
  weight?: number;
  dateOfBirth?: string; // ISO date
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  walletBalance?: number;
}

export interface AircraftData {
  registration: string;
  type: string;
  maxCapacity: number;
  maxWeight: number;
  emptyWeight: number;
}

export interface LoadData {
  loadNumber: number;
  aircraftIndex: number; // index into aircraft array
  status: string;
  scheduledAt?: string;
  slots: SlotData[];
}

export interface SlotData {
  athleteIndex: number; // index into athletes array
  jumpType: string;
  altitude?: number;
  exitWeight?: number;
}

export interface GearItemData {
  type: string;
  manufacturer: string;
  model: string;
  serial: string;
  dom?: string; // date of manufacture
  status: string;
  ownerIndex?: number; // index into athletes array, null = DZ-owned
}

export interface RigData {
  ownerIndex?: number;
  rigType: string;
  container: { manufacturer: string; model: string; serial: string; dom?: string; size?: string };
  mainCanopy: { manufacturer: string; model: string; size: number; serial: string; totalJumps: number; jumpsSinceInspection: number };
  reserve: { manufacturer: string; model: string; size: number; serial: string; repackDate: string; repackDueDate: string };
  aad: { manufacturer: string; model: string; serial: string; lastServiceDate: string; nextServiceDueDate: string; batteryDueDate?: string; endOfLifeDate?: string };
}

export interface WaiverTemplateData {
  name: string;
  type: string;
  version: string;
  content: string;
}

export interface BookingPackageData {
  name: string;
  description: string;
  jumpType: string;
  price: number;
  slots: number;
}

export interface IncidentData {
  title: string;
  severity: string;
  status: string;
  description: string;
  category: string;
  reporterIndex: number; // staff index
}

export interface BoogieData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  maxParticipants: number;
  packages: { name: string; price: number; description: string }[];
}

export interface JobPostData {
  title: string;
  description: string;
  requirements: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  status: string;
}

export interface CourseData {
  title: string;
  description: string;
  discipline: string;
  accessType: string;
  modules: { title: string; lessons: { title: string; durationMinutes: number; contentType: string }[] }[];
}

export interface CampaignData {
  name: string;
  subject: string;
  channel: string;
  status: string;
  scheduledAt?: string;
}

// ============================================================================
// REALISTIC DATA POOLS — used by scenario generators
// ============================================================================

/** Real skydiving first names (international, diverse) */
export const FIRST_NAMES = [
  'Jake', 'Maria', 'Chris', 'Emma', 'Alex', 'Sarah', 'Tom', 'Lisa',
  'Carlos', 'Aisha', 'Mike', 'Yuki', 'James', 'Priya', 'Omar',
  'Natasha', 'Diego', 'Mei', 'Sven', 'Fatima', 'Kyle', 'Zara',
  'Brandon', 'Ines', 'Raj', 'Hannah', 'Liam', 'Sofia', 'Tariq', 'Nadia',
  'Austin', 'Jade', 'Marcus', 'Elena', 'Tyler', 'Amara', 'Noah',
  'Camille', 'Kenji', 'Bianca', 'Ethan', 'Leila', 'Jordan', 'Rosa',
  'Darian', 'Ingrid', 'Felix', 'Alana', 'Viktor', 'Celeste',
  'Ryan', 'Mia', 'Sam', 'Olivia', 'Ben', 'Zoe', 'Max', 'Ava',
  'Leo', 'Iris', 'Kai', 'Luna', 'Theo', 'Ivy', 'Reza', 'Suki',
  'Dan', 'Nora', 'Finn', 'Ruby', 'Ash', 'Cleo', 'Jesse', 'Vera',
  'Phil', 'Gigi', 'Troy', 'Mona', 'Reed', 'Tess', 'Boyd', 'Dawn',
];

export const LAST_NAMES = [
  'Hunter', 'Santos', 'Blake', 'Kim', 'Wilson', 'Mendez', 'Davis',
  'Park', 'Rodriguez', 'Chen', 'Thompson', 'Patel', 'Garcia', 'Nakamura',
  'Johansson', 'Al-Rashid', 'Costa', 'Dubois', 'Müller', 'Ibrahim',
  'O\'Brien', 'Larsen', 'Volkov', 'Tanaka', 'Fernandez', 'Schmidt',
  'Nguyen', 'Kowalski', 'Jensen', 'Morales', 'Anderson', 'Lee',
  'Martinez', 'Taylor', 'Brown', 'Clark', 'Lewis', 'Walker',
  'Hall', 'Young', 'King', 'Wright', 'Lopez', 'Hill', 'Green',
  'Adams', 'Baker', 'Reed', 'Ross', 'Bell', 'Price', 'Gray',
  'Fox', 'Quinn', 'Nash', 'Webb', 'Cole', 'Stone', 'Frost', 'Wolf',
  'Hale', 'Knox', 'Chase', 'Rowe', 'Voss', 'Lane', 'Drake', 'Shaw',
  'Hart', 'Boyd', 'Lowe', 'Page', 'Holt', 'Dunn', 'Dale', 'Kerr',
];

/** Real container manufacturers */
export const CONTAINER_BRANDS: { manufacturer: string; models: string[] }[] = [
  { manufacturer: 'UPT', models: ['Vector 3', 'Sigma', 'Micro Sigma'] },
  { manufacturer: 'Sunpath', models: ['Javelin Odyssey', 'Javelin Aurora'] },
  { manufacturer: 'Mirage Systems', models: ['Mirage G4', 'Mirage G4.1'] },
  { manufacturer: 'Wings', models: ['W-14', 'W-15', 'W-18'] },
  { manufacturer: 'Aerodyne', models: ['Icon I5', 'Icon I3'] },
  { manufacturer: 'Parachute Labs', models: ['Racer'] },
];

/** Real main canopy manufacturers */
export const MAIN_CANOPY_BRANDS: { manufacturer: string; models: { name: string; sizes: number[] }[] }[] = [
  { manufacturer: 'Performance Designs', models: [
    { name: 'Sabre 3', sizes: [170, 150, 135, 120, 107] },
    { name: 'Stiletto', sizes: [170, 150, 135, 120, 107] },
    { name: 'Katana', sizes: [150, 135, 120, 107, 97] },
    { name: 'Spectre', sizes: [210, 190, 170, 150, 135] },
    { name: 'Storm', sizes: [230, 210, 190, 170] },
    { name: 'Navigator', sizes: [280, 260, 240, 220, 200] },
  ]},
  { manufacturer: 'NZ Aerosports', models: [
    { name: 'Crossfire 3', sizes: [149, 139, 129, 119, 109] },
    { name: 'Safire 3', sizes: [189, 169, 149, 129] },
    { name: 'JFX 2', sizes: [114, 104, 94, 84, 74] },
  ]},
  { manufacturer: 'Icarus', models: [
    { name: 'Neos', sizes: [149, 129, 119, 109] },
    { name: 'Sfire', sizes: [169, 149, 129, 119] },
  ]},
  { manufacturer: 'Fluid Wings', models: [
    { name: 'Gangster', sizes: [104, 94, 84, 74] },
  ]},
  { manufacturer: 'Aerodyne', models: [
    { name: 'Pilot', sizes: [210, 188, 168, 150] },
    { name: 'Zulu', sizes: [152, 132, 122, 112] },
  ]},
];

/** Real reserve canopy brands */
export const RESERVE_BRANDS: { manufacturer: string; models: { name: string; sizes: number[] }[] }[] = [
  { manufacturer: 'Performance Designs', models: [
    { name: 'PD Reserve', sizes: [176, 160, 143, 126, 113] },
    { name: 'Optimum', sizes: [176, 160, 143, 126, 113] },
  ]},
  { manufacturer: 'Icarus', models: [
    { name: 'Nano', sizes: [160, 143, 126, 113] },
  ]},
  { manufacturer: 'Aerodyne', models: [
    { name: 'Smart', sizes: [175, 160, 145, 132, 120] },
  ]},
  { manufacturer: 'Free Flight Enterprises', models: [
    { name: 'Raven', sizes: [181, 168, 150, 135] },
  ]},
];

/** Real AAD manufacturers and models */
export const AAD_BRANDS: { manufacturer: string; models: string[]; serviceIntervalYears: number; lifespanYears: number }[] = [
  { manufacturer: 'Airtec', models: ['Cypres 2', 'Cypres Speed'], serviceIntervalYears: 4, lifespanYears: 15 },
  { manufacturer: 'AAD', models: ['Vigil 2', 'Vigil 2+', 'Vigil Cuatro'], serviceIntervalYears: 0, lifespanYears: 20 },
  { manufacturer: 'Mars Parachute Systems', models: ['M2'], serviceIntervalYears: 0, lifespanYears: 15 },
];

/** Real aircraft types used at DZs */
export const AIRCRAFT_TYPES: { type: string; maxCapacity: number; maxWeight: number; emptyWeight: number }[] = [
  { type: 'Cessna 208B Grand Caravan', maxCapacity: 15, maxWeight: 3980, emptyWeight: 2145 },
  { type: 'de Havilland DHC-6 Twin Otter', maxCapacity: 22, maxWeight: 5670, emptyWeight: 3363 },
  { type: 'PAC 750XL', maxCapacity: 16, maxWeight: 3402, emptyWeight: 1406 },
  { type: 'Cessna 182 Skylane', maxCapacity: 4, maxWeight: 1406, emptyWeight: 794 },
  { type: 'Pilatus PC-6 Porter', maxCapacity: 10, maxWeight: 2800, emptyWeight: 1270 },
  { type: 'Beechcraft King Air C90', maxCapacity: 18, maxWeight: 4581, emptyWeight: 2812 },
  { type: 'Short SC.7 Skyvan', maxCapacity: 22, maxWeight: 5670, emptyWeight: 3363 },
  { type: 'CASA C-212 Aviocar', maxCapacity: 30, maxWeight: 8000, emptyWeight: 4400 },
];

/** N-number generator (US registration) */
export function generateTailNumber(prefix = 'N'): string {
  const num = Math.floor(100 + Math.random() * 900);
  const suffix = String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                 String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${prefix}${num}${suffix}`;
}

/** Serial number generator */
export function generateSerial(prefix: string, length = 6): string {
  const num = Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1));
  return `${prefix}-${num}`;
}

/** Pick random element from array */
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick N unique random elements */
export function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

/** Generate realistic email from name */
export function makeEmail(first: string, last: string, domain: string): string {
  return `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, '')}@${domain}`;
}

/** Generate random date within range */
export function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/** Generate date N days from now */
export function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/** Generate date N days ago */
export function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/** Format date as ISO string (date only) */
export function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Real DZ location data */
export const DZ_LOCATIONS: { name: string; icao: string; lat: number; lon: number; tz: string; currency: string }[] = [
  { name: 'Perris, CA', icao: 'KPRZ', lat: 33.7672, lon: -117.2157, tz: 'America/Los_Angeles', currency: 'USD' },
  { name: 'Eloy, AZ', icao: 'KE60', lat: 32.8067, lon: -111.5867, tz: 'America/Phoenix', currency: 'USD' },
  { name: 'DeLand, FL', icao: 'KDED', lat: 29.0667, lon: -81.2833, tz: 'America/New_York', currency: 'USD' },
  { name: 'Empuriabrava, Spain', icao: 'LEAP', lat: 42.2594, lon: 3.1106, tz: 'Europe/Madrid', currency: 'EUR' },
  { name: 'Seville, Spain', icao: 'LEZL', lat: 37.4181, lon: -5.8931, tz: 'Europe/Madrid', currency: 'EUR' },
  { name: 'Toogoolawah, QLD', icao: 'YTGL', lat: -27.0986, lon: 152.3814, tz: 'Australia/Brisbane', currency: 'AUD' },
  { name: 'Dubai Desert Campus, UAE', icao: 'OMDM', lat: 25.0657, lon: 55.1713, tz: 'Asia/Dubai', currency: 'AED' },
  { name: 'Leutkirch, Germany', icao: 'EDNL', lat: 47.8589, lon: 10.0164, tz: 'Europe/Berlin', currency: 'EUR' },
];

/** Booking package templates */
export const BOOKING_PACKAGES: BookingPackageData[] = [
  { name: 'Solo Tandem Jump', description: 'One tandem skydive from 14,000 ft', jumpType: 'TANDEM', price: 299, slots: 1 },
  { name: 'Tandem + Photos', description: 'Tandem jump with hand-cam photo package', jumpType: 'TANDEM', price: 369, slots: 1 },
  { name: 'Tandem + Video', description: 'Tandem jump with professional outside video', jumpType: 'TANDEM', price: 399, slots: 1 },
  { name: 'Tandem Premium', description: 'Tandem jump with photos, video, and T-shirt', jumpType: 'TANDEM', price: 449, slots: 1 },
  { name: 'AFF Level 1', description: 'First jump course with 2 instructors', jumpType: 'AFF', price: 349, slots: 1 },
  { name: 'AFF Full Course', description: 'Complete AFF levels 1-8', jumpType: 'AFF', price: 2499, slots: 8 },
  { name: 'Fun Jump Ticket', description: 'Single fun jump to 14,000 ft', jumpType: 'FUN_JUMP', price: 28, slots: 1 },
  { name: '10-Jump Block', description: '10 fun jumps — save $30', jumpType: 'FUN_JUMP', price: 250, slots: 10 },
  { name: 'Coach Jump', description: 'One coached jump with certified coach', jumpType: 'COACH', price: 85, slots: 1 },
  { name: 'Hop & Pop', description: 'Low-altitude deployment from 5,500 ft', jumpType: 'HOP_POP', price: 18, slots: 1 },
];

/** Waiver template content snippets */
export const WAIVER_TEMPLATES: WaiverTemplateData[] = [
  {
    name: 'Standard Liability Waiver',
    type: 'LIABILITY',
    version: '2.1',
    content: 'I acknowledge that skydiving involves inherent risks including serious injury or death. I voluntarily assume all such risks and release SkyLara and the dropzone operator from liability.',
  },
  {
    name: 'Tandem Student Waiver',
    type: 'TANDEM',
    version: '1.4',
    content: 'I understand that I will be attached to a USPA-rated tandem instructor via a dual harness system. I agree to follow all instructor commands during the skydive.',
  },
  {
    name: 'Minor Participant Waiver',
    type: 'MINOR',
    version: '1.2',
    content: 'As the legal parent or guardian of the minor named below, I consent to their participation in tandem skydiving and assume all associated risks on their behalf.',
  },
  {
    name: 'Media Release',
    type: 'MEDIA',
    version: '1.0',
    content: 'I grant the dropzone permission to use any photos or video footage captured during my skydive for promotional purposes including social media and website.',
  },
];

/** Incident templates */
export const INCIDENT_TEMPLATES: { title: string; severity: string; category: string; description: string }[] = [
  { title: 'Hard opening on Sabre 3 135', severity: 'LOW', category: 'EQUIPMENT', description: 'Jumper reported harder than normal opening on jump 412. Canopy inspected, pack job adjusted. No injury.' },
  { title: 'Off-DZ landing — student', severity: 'MEDIUM', category: 'STUDENT', description: 'AFF Level 4 student landed 200m south of target area in open field. No injury. Debrief completed on wind assessment.' },
  { title: 'AAD fire — Cypres activation', severity: 'HIGH', category: 'EQUIPMENT', description: 'Experienced jumper had delayed deployment. Cypres activated at 750ft. Reserve deployed successfully. Jumper uninjured. Rig grounded pending investigation.' },
  { title: 'Weather hold violation', severity: 'LOW', category: 'OPERATIONAL', description: 'Load 8 departed during marginal wind conditions (22kt gusting 28kt). DZO counseled pilot. No incidents during jump run.' },
  { title: 'Tandem drogue hesitation', severity: 'MEDIUM', category: 'EQUIPMENT', description: 'Tandem drogue had brief hesitation on deployment. TI used hand-deploy backup. Landed safely. Rig sent for inspection.' },
];

/** Job post templates */
export const JOB_TEMPLATES: JobPostData[] = [
  { title: 'Tandem Instructor', description: 'Seeking experienced tandem instructors for busy season. Must hold current USPA TI rating with 500+ tandem jumps.', requirements: 'USPA TI rating, 500+ tandem jumps, current medical', location: 'On-site', salaryMin: 45000, salaryMax: 75000, status: 'PUBLISHED' },
  { title: 'AFF Instructor', description: 'Looking for AFF instructors to join our student training program. Competitive per-jump pay plus benefits.', requirements: 'USPA AFFI rating, 500+ total jumps, coaching experience', location: 'On-site', salaryMin: 40000, salaryMax: 65000, status: 'PUBLISHED' },
  { title: 'Chief Instructor', description: 'Experienced Chief Instructor needed to oversee safety, training, and instructor development at our growing DZ.', requirements: '3000+ jumps, S&TA experience, management skills', location: 'On-site', salaryMin: 70000, salaryMax: 95000, status: 'PUBLISHED' },
  { title: 'Jump Pilot — Twin Otter', description: 'Type-rated Twin Otter pilot for high-volume operations. 200+ hours turbine PIC preferred.', requirements: 'Commercial pilot license, Twin Otter type rating, 500+ PIC hours', location: 'On-site', salaryMin: 55000, salaryMax: 85000, status: 'PUBLISHED' },
  { title: 'Senior Rigger', description: 'FAA Senior Rigger with master certification preferred. Manage repack schedule for 40+ rigs.', requirements: 'FAA Senior Rigger certificate, master preferred, 5+ years experience', location: 'On-site', salaryMin: 50000, salaryMax: 70000, status: 'DRAFT' },
  { title: 'Manifest Coordinator', description: 'Friendly, organized manifest staff for busy weekend operations. Training provided on SkyLara platform.', requirements: 'Customer service experience, computer literacy, available weekends', location: 'On-site', salaryMin: 32000, salaryMax: 42000, status: 'PUBLISHED' },
];

/** Learning course templates */
export const COURSE_TEMPLATES: CourseData[] = [
  {
    title: 'AFF First Jump Course',
    description: 'Complete ground school for your first AFF skydive. Covers body position, emergency procedures, and equipment orientation.',
    discipline: 'AFF',
    accessType: 'SUBSCRIBER_ONLY',
    modules: [
      { title: 'Ground School Fundamentals', lessons: [
        { title: 'Welcome & Course Overview', durationMinutes: 10, contentType: 'VIDEO' },
        { title: 'Equipment Orientation', durationMinutes: 20, contentType: 'VIDEO' },
        { title: 'Body Position & Arch', durationMinutes: 15, contentType: 'VIDEO' },
        { title: 'Emergency Procedures', durationMinutes: 25, contentType: 'VIDEO' },
        { title: 'Aircraft Exit & Freefall', durationMinutes: 15, contentType: 'VIDEO' },
      ]},
      { title: 'Canopy Flight', lessons: [
        { title: 'Canopy Control Basics', durationMinutes: 20, contentType: 'VIDEO' },
        { title: 'Landing Patterns', durationMinutes: 15, contentType: 'VIDEO' },
        { title: 'Emergency Landing Scenarios', durationMinutes: 15, contentType: 'VIDEO' },
      ]},
    ],
  },
  {
    title: 'Canopy Flight Fundamentals',
    description: 'Deep dive into canopy piloting for intermediate jumpers. Improve your landings, understand toggle input, and learn to read the wind.',
    discipline: 'CANOPY',
    accessType: 'AUTHENTICATED_FREE',
    modules: [
      { title: 'Understanding Your Canopy', lessons: [
        { title: 'Wing Loading & Performance', durationMinutes: 20, contentType: 'VIDEO' },
        { title: 'Toggle vs Riser Input', durationMinutes: 15, contentType: 'VIDEO' },
        { title: 'Stall Characteristics', durationMinutes: 12, contentType: 'VIDEO' },
      ]},
      { title: 'Landing Mastery', lessons: [
        { title: 'Pattern Setup & Final Approach', durationMinutes: 18, contentType: 'VIDEO' },
        { title: 'Crosswind Landings', durationMinutes: 15, contentType: 'VIDEO' },
        { title: 'Turbulence & Rotor Awareness', durationMinutes: 12, contentType: 'VIDEO' },
      ]},
    ],
  },
  {
    title: 'Freefly Progression',
    description: 'From belly to head-down. Progressive freefly training covering sit, head-up, head-down, and transitions.',
    discipline: 'FREEFLY',
    accessType: 'SUBSCRIBER_ONLY',
    modules: [
      { title: 'Sit Flying', lessons: [
        { title: 'Sit Position Basics', durationMinutes: 15, contentType: 'VIDEO' },
        { title: 'Sit Turns & Movement', durationMinutes: 15, contentType: 'VIDEO' },
      ]},
      { title: 'Head-Down', lessons: [
        { title: 'Head-Down Entry from Sit', durationMinutes: 20, contentType: 'VIDEO' },
        { title: 'Head-Down Stability', durationMinutes: 15, contentType: 'VIDEO' },
        { title: 'Carving & Angle Flying', durationMinutes: 18, contentType: 'VIDEO' },
      ]},
    ],
  },
  {
    title: 'Safety Refresher — Annual Review',
    description: 'Mandatory annual safety refresher covering emergency procedures, gear inspection, and operational awareness.',
    discipline: 'SAFETY',
    accessType: 'PUBLIC',
    modules: [
      { title: 'Emergency Procedures Review', lessons: [
        { title: 'Malfunction Decision Tree', durationMinutes: 20, contentType: 'VIDEO' },
        { title: 'Two-Out Scenarios', durationMinutes: 15, contentType: 'VIDEO' },
        { title: 'Aircraft Emergencies', durationMinutes: 12, contentType: 'VIDEO' },
      ]},
    ],
  },
];

/** Campaign templates */
export const CAMPAIGN_TEMPLATES: CampaignData[] = [
  { name: 'Welcome Series — New Jumpers', subject: 'Welcome to the sky! Your first jump guide', channel: 'EMAIL', status: 'ACTIVE' },
  { name: 'Weekend Weather Update', subject: 'This weekend\'s jump forecast looks perfect', channel: 'EMAIL', status: 'ACTIVE' },
  { name: 'License Upgrade Push', subject: 'Ready for your B-license? Here\'s what you need', channel: 'EMAIL', status: 'DRAFT' },
  { name: 'Boogie Early Bird', subject: 'Spring Boogie 2026 — Early bird pricing ends Friday', channel: 'EMAIL', status: 'SCHEDULED', scheduledAt: daysFromNow(7).toISOString() },
  { name: 'Gear Check Reminder', subject: 'Your reserve repack is coming due — schedule now', channel: 'SMS', status: 'ACTIVE' },
  { name: 'Lapsed Jumper Re-engagement', subject: 'We miss you! Come back for a free coached jump', channel: 'EMAIL', status: 'DRAFT' },
];

/** Generate a unique name pair without collision */
let usedNames = new Set<string>();
export function uniqueName(): { first: string; last: string } {
  let attempts = 0;
  while (attempts < 200) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const key = `${first}-${last}`;
    if (!usedNames.has(key)) {
      usedNames.add(key);
      return { first, last };
    }
    attempts++;
  }
  // Fallback: append number
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  usedNames.add(`${first}-${last}-${usedNames.size}`);
  return { first, last };
}

export function resetNamePool(): void {
  usedNames = new Set();
}

/** Generate a random rig with realistic components */
export function generateRig(rigType: 'SPORT' | 'TANDEM' | 'STUDENT' | 'RENTAL', ownerIndex?: number): RigData {
  const container = pick(CONTAINER_BRANDS);
  const mainBrand = pick(MAIN_CANOPY_BRANDS);
  const mainModel = pick(mainBrand.models);
  const mainSize = pick(mainModel.sizes);
  const reserveBrand = pick(RESERVE_BRANDS);
  const reserveModel = pick(reserveBrand.models);
  const reserveSize = pick(reserveModel.sizes);
  const aadBrand = pick(AAD_BRANDS);

  const now = new Date();
  const repackDate = daysAgo(Math.floor(Math.random() * 150));
  const repackDue = new Date(repackDate);
  repackDue.setDate(repackDue.getDate() + 180);

  const aadServiceDate = daysAgo(Math.floor(Math.random() * 365 * 2));
  const nextService = new Date(aadServiceDate);
  nextService.setFullYear(nextService.getFullYear() + aadBrand.serviceIntervalYears || 4);

  const batteryDue = new Date(aadServiceDate);
  batteryDue.setFullYear(batteryDue.getFullYear() + 5);

  const eolDate = new Date(aadServiceDate);
  eolDate.setFullYear(eolDate.getFullYear() + aadBrand.lifespanYears);

  return {
    ownerIndex,
    rigType,
    container: {
      manufacturer: container.manufacturer,
      model: pick(container.models),
      serial: generateSerial('CTR'),
      dom: isoDate(daysAgo(Math.floor(Math.random() * 365 * 5) + 365)),
      size: rigType === 'TANDEM' ? 'V-T' : `M${Math.floor(3 + Math.random() * 5)}`,
    },
    mainCanopy: {
      manufacturer: mainBrand.manufacturer,
      model: mainModel.name,
      size: mainSize,
      serial: generateSerial('MC'),
      totalJumps: Math.floor(Math.random() * 800) + 50,
      jumpsSinceInspection: Math.floor(Math.random() * 45),
    },
    reserve: {
      manufacturer: reserveBrand.manufacturer,
      model: reserveModel.name,
      size: reserveSize,
      serial: generateSerial('RSV'),
      repackDate: isoDate(repackDate),
      repackDueDate: isoDate(repackDue),
    },
    aad: {
      manufacturer: aadBrand.manufacturer,
      model: pick(aadBrand.models),
      serial: generateSerial('AAD'),
      lastServiceDate: isoDate(aadServiceDate),
      nextServiceDueDate: isoDate(nextService),
      batteryDueDate: isoDate(batteryDue),
      endOfLifeDate: isoDate(eolDate),
    },
  };
}
