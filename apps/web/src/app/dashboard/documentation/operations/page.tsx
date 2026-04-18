'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Calendar,
  Shield,
  Cloud,
  AlertTriangle,
  Calculator,
  Wrench,
  FileWarning,
  Settings,
  X,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '/dashboard/documentation', label: 'Overview' },
  { href: '/dashboard/documentation/user-guides', label: 'User Guides' },
  { href: '/dashboard/documentation/operations', label: 'Operations' },
  { href: '/dashboard/documentation/api', label: 'API Reference' },
  { href: '/dashboard/documentation/integrations', label: 'Integrations' },
  { href: '/dashboard/documentation/process-flows', label: 'Process Flows' },
  { href: '/dashboard/documentation/troubleshooting', label: 'Troubleshooting' },
  { href: '/dashboard/documentation/changelog', label: 'Changelog' },
];

interface SOP {
  title: string;
  icon: React.ElementType;
  lastUpdated: string;
  status: 'active' | 'draft' | 'review';
  content: string;
}

const STATUS_STYLES = {
  active: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  draft: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
  review: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
};

const SOPS: SOP[] = [
  {
    title: 'Daily Operations Checklist',
    icon: ClipboardCheck,
    lastUpdated: '2026-03-15',
    status: 'active',
    content: `PRE-OPENING (6:00 AM - 7:00 AM)
1. Facility Walkthrough: Inspect hangar, packing area, classroom, and landing area for hazards or debris. Ensure fire extinguishers are accessible and inspection-current.
2. Weather Assessment: Pull current METAR/TAF from the nearest ASOS station. Check surface winds, winds aloft at jump altitudes (use winds aloft forecast), cloud ceiling, and visibility. Record in the daily weather log.
3. Aircraft Preflight: Pilot completes preflight inspection per aircraft POH. Verify fuel levels meet minimum requirements for planned operations (typically 3 hours of fuel). Check oil, tire pressure, control surfaces, and jump door operation.
4. Manifest System Boot: Log into SkyLara, verify internet connectivity and WebSocket connection status. Confirm Stripe terminal is powered on and connected. Test the PA/intercom system.
5. Safety Equipment Check: Verify first aid kits are stocked (hangar, aircraft, landing area), AED is charged and accessible, wind indicators (windsock, streamers) are visible and functional, radio batteries are charged (minimum 2 spare batteries per handheld).
6. Staff Briefing: Conduct morning briefing covering: weather outlook, planned aircraft availability, special events or groups, any safety notes from previous day, and instructor/TI assignments for the day.

DURING OPERATIONS (7:00 AM - SUNSET)
7. Continuous weather monitoring every 30 minutes minimum. Update hold/resume status on manifest board.
8. Monitor load turnaround times and adjust scheduling as needed.
9. Ensure all jumpers receive appropriate briefings before each load.
10. Track fuel consumption and schedule refueling to avoid operational delays.
11. Log all incidents, near-misses, and safety observations in real-time.

POST-OPERATIONS (SUNSET + 1 HOUR)
12. Final aircraft shutdown and securing per POH procedures.
13. Complete end-of-day reconciliation in SkyLara.
14. Secure all gear in designated storage areas.
15. Lock facility, arm security system, verify all exterior lights are operational.`,
  },
  {
    title: 'Manifest Procedures',
    icon: Calendar,
    lastUpdated: '2026-03-10',
    status: 'active',
    content: `LOAD CREATION
1. Create a new load when: the current load is full, a different altitude or aircraft is needed, or time-based scheduling requires a new load slot.
2. Always verify aircraft status is "Active" before assigning to a load. Never assign an aircraft in "Maintenance" status.
3. Set target altitude based on jump type: 14,000 ft (standard), 18,000 ft (high altitude with O2), 10,000 ft (hop-n-pops), 5,000 ft (accuracy).

JUMPER ASSIGNMENT RULES
4. Verify check-in status before manifesting. Athlete must show "Checked In" status with green indicator.
5. Tandem pairs always occupy 2 slots. Assign TI first, then student. Never manifest a student without an assigned TI.
6. AFF students require 1 instructor for levels 4-7, 2 instructors for levels 1-3. Verify instructor-to-student ratio before load call.
7. Weight and balance must be verified before each load call. The system calculates this automatically, but manifest staff should verify the total is within limits.
8. Exit order should be: high-altitude deployment first (wingsuits, high pulls), then freefly groups, belly groups, tandems, and students last (lowest deployment altitude, highest priority for clear airspace).

LOAD MANAGEMENT
9. Call time is 15 minutes before planned takeoff. Send the CALLED notification and announce on PA.
10. At BOARDING, conduct a verbal roll call. Any no-shows should be removed from the load and replaced from the waitlist if available.
11. Never dispatch a load with empty slots if there are jumpers on the waitlist, unless the pilot determines the delay would exceed 10 minutes.
12. Record actual takeoff time when aircraft departs. This starts the load timer for landing area management.`,
  },
  {
    title: 'Safety Protocols',
    icon: Shield,
    lastUpdated: '2026-03-20',
    status: 'active',
    content: `GEAR REQUIREMENTS
1. All sport jumpers must have a current AAD (Automatic Activation Device) installed and turned on. Accepted models: Cypres, Vigil, Mars, Astra. AAD must be within service life and not in student mode for licensed jumpers.
2. All harness/container systems must be inspected and have a current FAA rigger repack within 180 days (per FAR 105.43).
3. Audible altimeters are required for all freefall jumps. Visual altimeters are required for students and tandems.
4. Helmets are mandatory for all students, AFF instructors in harness hold, and recommended for all jumpers.

ALTITUDE RULES
5. Minimum opening altitude for sport jumpers: 2,500 feet AGL. Recommended: 3,000 feet AGL.
6. Minimum deployment altitude for AFF students: 5,500 feet AGL (instructor-initiated if student fails to deploy by this altitude).
7. Tandem drogue deployment: immediately after exit for stability. Main deployment: 5,000 feet AGL minimum.
8. Hard deck (no-cutaway altitude): 1,000 feet AGL for sport, 1,800 feet AGL for tandems. Below hard deck, land the reserve regardless of malfunction type.

CANOPY RULES
9. Right-of-way: lower canopy has right of way. All jumpers must fly predictable patterns.
10. Landing pattern: left-hand traffic pattern unless posted otherwise. Final approach into the wind.
11. No hook turns below 1,000 feet AGL for jumpers with fewer than 200 jumps. No hook turns below 500 feet AGL for any jumper.
12. Canopy collision avoidance: if two canopies are on collision course, both turn right.

MEDICAL
13. First aid kit locations: manifest building, hangar, landing area, each jump aircraft.
14. AED location: manifest building main entrance. All staff must know AED location and basic operation.
15. Emergency services contact posted at manifest: local EMS, nearest trauma center, poison control.
16. Incident commander for medical emergencies: most senior staff member on site until relieved.`,
  },
  {
    title: 'Weather Decision Matrix',
    icon: Cloud,
    lastUpdated: '2026-04-01',
    status: 'active',
    content: `GREEN (FULL OPERATIONS)
- Surface winds: 0-14 mph
- Winds aloft at jump altitude: 0-30 mph
- Cloud ceiling: above jump altitude (no clouds in freefall or canopy flight zone)
- Visibility: 5+ miles
- No precipitation
- No thunderstorms within 30 miles
Action: Normal operations. All jump types permitted.

YELLOW (MODIFIED OPERATIONS)
- Surface winds: 15-20 mph
- Winds aloft at jump altitude: 31-45 mph
- Cloud ceiling: 5,000+ feet AGL but below jump altitude
- Visibility: 3-5 miles
- Light precipitation possible
Action: Restrict student and tandem operations. Sport jumpers with 200+ jumps may continue at DZO/S&TA discretion. Lower altitude jumps only if ceiling restricts normal altitude. Brief all jumpers on conditions. Monitor for deterioration every 15 minutes.

RED (OPERATIONS SUSPENDED)
- Surface winds: 21+ mph (sustained) or gusts exceeding 25 mph
- Cloud ceiling: below 3,000 feet AGL
- Visibility: below 3 miles
- Active precipitation (rain, snow, hail)
- Thunderstorms within 15 miles (lightning = automatic ground stop)
- Dust devils or rotors observed on the ground
Action: All operations suspended. Move jumpers to shelter if lightning is present. Resume only when conditions improve to Yellow or Green for at least 30 minutes continuously. DZO or S&TA makes resume decision.

SPECIAL CONDITIONS
- Turbulence: PIREP-based. Moderate or severe turbulence = ground stop.
- Temperature: Below 0F at altitude requires cold weather briefing. Frostbite risk assessment.
- Sunset: Final load must allow all canopies to land 30 minutes before official sunset.
- Density altitude: Calculate for high-altitude DZs. Adjust aircraft performance limits accordingly.`,
  },
  {
    title: 'Emergency Procedures',
    icon: AlertTriangle,
    lastUpdated: '2026-03-25',
    status: 'active',
    content: `AIRCRAFT EMERGENCY - ENGINE FAILURE
Below 1,000 feet AGL: All jumpers remain seated. Pilot executes emergency landing per POH.
1,000-4,000 feet AGL: Jumpers may exit on pilot command if safe to do so. Exit in rapid sequence, pull immediately.
Above 4,000 feet AGL: All jumpers exit immediately on pilot command. Maintain heading away from aircraft.
Pilot notifies manifest via radio: "Mayday, [aircraft ID], engine failure at [altitude]."

JUMPER IN TRESS/WATER/POWER LINES
Trees: Do not attempt self-rescue. Radio manifest with location. Wait for ground crew with ladder/climbing gear. Cutaway only if injury risk from hanging exceeds falling risk.
Water: Activate flotation if equipped. Cutaway from harness BEFORE water entry (canopy in water = drowning risk). If in harness on water, cutaway RSL, then cutaway main, slip out of harness.
Power lines: Do not touch the ground while in contact with lines. Do not allow anyone to touch the jumper. Call 911 for power company emergency response.

LANDING AREA EMERGENCY
Off-DZ landing: Jumper activates cell phone GPS. Manifest initiates ground search based on last known position and wind drift calculation.
Landing injury: Nearest staff member assesses and calls for first aid. Do not move the injured person if spinal injury is suspected. Activate EMS if fracture, loss of consciousness, or severe bleeding.
Canopy collision: Both jumpers spiral away from each other. If entangled above 1,000 AGL, lower jumper cuts away. Below 1,000 AGL, ride the entanglement to landing and PLF.

FACILITY EMERGENCY
Fire: Evacuate immediately. Assembly point: parking lot north end. Call 911. Do not attempt to fight fire beyond initial extinguisher use.
Severe weather (tornado warning): All personnel to designated shelter (manifest building interior hallway). Secure aircraft if time permits.
Active threat: Lockdown procedure. Secure all doors. Personnel shelter in place. Call 911.

ALL EMERGENCIES
1. Incident Commander takes charge (most senior staff, typically DZO or S&TA).
2. Ground stop all operations immediately.
3. Account for all personnel (staff and jumpers).
4. Notify emergency services as appropriate.
5. Preserve the scene for investigation.
6. Begin incident report in SkyLara within 1 hour.
7. Notify USPA if fatality or serious injury (within 24 hours per BSR).`,
  },
  {
    title: 'End of Day Reconciliation',
    icon: Calculator,
    lastUpdated: '2026-02-28',
    status: 'active',
    content: `FINANCIAL RECONCILIATION
1. Open the End of Day module in SkyLara (Dashboard > End of Day).
2. Count the physical cash drawer. Enter the total in the Cash Count field.
3. The system displays expected cash based on recorded cash transactions. Variance must be within $5.00. If variance exceeds $5.00, investigate and document the discrepancy.
4. Review credit card transactions in SkyLara against the Stripe dashboard. Totals should match exactly.
5. Review any open tabs or unpaid balances. Contact athletes with outstanding balances or carry forward to next visit.
6. Print or export the Daily Revenue Report showing: total revenue by payment method, revenue by jump type, merchandise sales, video package sales, and any refunds processed.

OPERATIONAL RECONCILIATION
7. Verify all loads are in COMPLETE status. Any loads still showing IN_FLIGHT or other active status must be resolved.
8. Verify all checked-in athletes have been accounted for (either completed jumps or checked out).
9. Review the day's incident reports. Ensure all incidents have been properly documented with required fields.
10. Log total loads flown, total jumps completed, and fuel consumed for the day.

GEAR RECONCILIATION
11. All rental gear returned and accounted for. Inspect for damage.
12. All tandem rigs packed and stored properly. Log pack jobs completed.
13. AADs turned off on all rigs going into storage.
14. Student gear secured in locked storage.

CLOSE OUT
15. Submit the end-of-day report in SkyLara. This locks the day's records from further modification (admin override available).
16. Set the system to "Closed" status which disables check-in and manifesting until the next day's opening.
17. Generate the daily operations summary email to DZO/management.`,
  },
  {
    title: 'Gear Inspection Protocol',
    icon: Wrench,
    lastUpdated: '2026-03-05',
    status: 'review',
    content: `PRE-JUMP GEAR CHECK (ALL JUMPERS)
1. Three-ring release system: rings properly seated, cable loop routed correctly, yellow cutaway cable visible and routed through the housing.
2. RSL (Reserve Static Line): connected if equipped (recommended disconnected for CRW and certain wingsuit jumps). Verify MARD (e.g., Skyhook) connection if equipped.
3. AAD: powered on, showing correct altitude (ground level calibration). Verify mode matches jumper type (student, tandem, expert, speed).
4. Closing flaps: all container flaps closed and secured. No exposed grommets or loose tuck tabs.
5. Chest strap and leg straps: properly routed through hardware, snug but not restricting.
6. Handles: cutaway handle (right side) and reserve handle (left side) properly seated in their pockets, visible and accessible.
7. Helmet chin strap secured. Goggles clean and properly fitted.
8. Altimeter zeroed to field elevation. Audible altimeter set to correct settings.

TANDEM-SPECIFIC CHECKS
9. Drogue deployment handle accessible. Drogue bridle properly routed and packed.
10. Passenger attachment points: upper and lower hooks verified, locking mechanisms engaged.
11. Drogue kill line: routed correctly through the deployment sequence.
12. Student harness: properly sized to passenger, all adjustments secured.

180-DAY REPACK INSPECTION (FAA RIGGER ONLY)
13. Full reserve inspection per manufacturer specifications.
14. Verify reserve canopy is within service life and matches container specifications.
15. Inspect all closing loops for wear. Replace if any fraying is visible.
16. Check grommet tightness and alignment.
17. Verify AAD cutter and firing unit are within service life.
18. Document inspection in SkyLara gear management module. Enter next repack due date.
19. Apply rigger seal and record seal number.`,
  },
  {
    title: 'Incident Reporting Process',
    icon: FileWarning,
    lastUpdated: '2026-03-18',
    status: 'active',
    content: `IMMEDIATE RESPONSE (0-15 MINUTES)
1. Ensure scene safety. Provide first aid if needed. Activate EMS for injuries.
2. Ground stop if the incident affects ongoing operations.
3. Preserve physical evidence (do not move gear, do not pack canopies involved).
4. Identify witnesses and ask them to remain available.

INITIAL REPORT (WITHIN 1 HOUR)
5. Open SkyLara > Incidents > New Report.
6. Select incident category: Malfunction, Injury, Near-Miss, Equipment Failure, Procedural Violation, Weather-Related, or Other.
7. Select severity level: Level 1 (informational/near-miss), Level 2 (minor injury, no medical transport), Level 3 (serious injury, medical transport required), Level 4 (fatality or life-threatening injury).
8. Enter incident details: date/time, location, personnel involved, weather conditions at time of incident, description of events.
9. Attach any available media: photos of gear, landing area, or relevant conditions.

INVESTIGATION (WITHIN 24 HOURS)
10. DZO or S&TA reviews initial report and assigns investigator.
11. Collect witness statements (use the witness statement template in SkyLara).
12. For gear-related incidents: quarantine all equipment involved. Have a rigger inspect and document findings.
13. Review available video (aircraft cameras, ground cameras, jumper-mounted cameras).
14. Document timeline of events with all known facts.

FOLLOW-UP (WITHIN 72 HOURS)
15. Complete the root cause analysis section of the incident report.
16. Identify contributing factors and preventive measures.
17. If USPA notification is required (fatality, serious injury): submit via USPA online reporting system.
18. If FAA notification is required (per FAR 105): file within required timeframe.
19. Brief all staff on lessons learned at next safety meeting.
20. Update SOPs if the incident reveals a procedural gap.
21. Close the incident report with DZO sign-off.`,
  },
];

export default function OperationsPage() {
  const [search, setSearch] = useState('');
  const [expandedSops, setExpandedSops] = useState<Set<string>>(new Set());

  const toggleSop = (title: string) => {
    setExpandedSops((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const filteredSops = useMemo(() => {
    if (!search.trim()) return SOPS;
    const q = search.toLowerCase();
    return SOPS.filter(
      (sop) =>
        sop.title.toLowerCase().includes(q) || sop.content.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-800 bg-white dark:bg-slate-800 dark:bg-gray-900 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  link.href === '/dashboard/documentation/operations'
                    ? 'bg-gray-900 text-white dark:bg-white dark:bg-slate-800 dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-7 h-7 text-emerald-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Operations & SOPs</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Standard operating procedures for safe and efficient dropzone operations.
        </p>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search SOPs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* SOP List */}
        {filteredSops.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-800">
            <ClipboardCheck className="w-10 h-10 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No SOPs match your search.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSops.map((sop) => {
              const Icon = sop.icon;
              const isExpanded = expandedSops.has(sop.title);
              return (
                <div key={sop.title} className="bg-white dark:bg-slate-800 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-800 overflow-hidden">
                  <button
                    onClick={() => toggleSop(sop.title)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{sop.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-400">Updated {sop.lastUpdated}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[sop.status]}`}>
                            {sop.status.charAt(0).toUpperCase() + sop.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                          {sop.content}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
