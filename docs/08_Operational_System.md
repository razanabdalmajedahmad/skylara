# SKYLARA

_Source: 08_Operational_System.docx_

SKYLARA
Operational System Design
Real-World DZ Logic  |  Step 3
Version 1.0  |  April 2026
Manifest Engine  •  Instructor System  •  Check-In  •  FSM  •  CG Gate  •  Exit Order  •  Approval Flow
# Table of Contents
# 1. Load Finite State Machine (FSM)
Every load in SkyLara is governed by a strict state machine. No status change happens outside this FSM. The FSM is enforced at the service layer, not the database, so the transition logic can emit events, trigger notifications, and run safety gates before committing.
## 1.1 State Diagram
The load passes through 11 states. Each transition has preconditions, side effects, and authorized roles.
## 1.2 State Definitions
## 1.3 Transition Rules (TypeScript)
## 1.4 Side Effects per Transition
## 1.5 Timer-Driven Transitions
The 30MIN → 20MIN → 10MIN countdown is driven by a cron job that runs every 60 seconds. It queries loads WHERE status = '30MIN' AND call_30min_sent_at <= NOW() - INTERVAL 10 MINUTE and auto-transitions them. Same pattern for 20MIN → 10MIN. The 10MIN → BOARDING transition is manual (manifest staff triggers it when ready).
# 2. Manifest Engine
The manifest engine is the core of DZ operations. It manages loads, slots, and the real-time load board visible to all connected clients via WebSocket.
## 2.1 Create Load
## 2.2 Add Jumper to Load (Slot Assignment)
Adding a jumper creates a slot record, validates compliance, and auto-assigns instructors for tandem/AFF slots.
## 2.3 Remove Jumper from Load
## 2.4 Load Board Real-Time Protocol
Every manifest client subscribes to a WebSocket channel scoped to their dropzone. The load board auto-refreshes on every mutation. The protocol uses Redis Pub/Sub for fan-out across multiple server instances.
# 3. Center of Gravity (CG) Blocking Gate
The CG gate is the most critical safety mechanism in the manifest engine. No load can progress from LOCKED to 30MIN without a PASS result. This prevents overweight or out-of-balance flights.
## 3.1 CG Calculation Algorithm
## 3.2 CG Gate Integration
When a load reaches LOCKED status, the system automatically triggers a CG calculation. If the result is FAIL, the load cannot advance. Manifest staff must either remove jumpers, reassign seats, or override (with audit trail via override_log).
## 3.3 Override Protocol
Operators (not manifest staff) can override a MARGINAL CG. FAIL cannot be overridden — jumpers must be removed. Every override is logged to override_log with the operator's ID, reason, and timestamp. This creates a permanent audit trail for regulatory review.
# 4. Instructor Assignment & Skill Matching
SkyLara's instructor system goes beyond simple assignment. It matches instructors to students based on required skills, availability, workload, and special qualifications (handicap, overweight, camera).
## 4.1 Skill Matching Algorithm
## 4.2 Skill Requirement Matrix
## 4.3 Availability Management
Instructors set weekly availability windows. The system supports four employment types with different scheduling rules:
## 4.4 Workload Balancing
The scoring algorithm ensures fair distribution. Full-time instructors get priority for auto-assignment, but the system tracks daily and monthly load counts to prevent burnout. If an instructor has done 6+ loads today, they drop to the bottom of the queue. If they are currently on an active (AIRBORNE) load, they are deprioritized until that load completes.
# 5. Activity Check-In Workflow
Check-in is the front door of DZ operations. Whether a walk-in tandem passenger, a returning student, or a licensed jumper showing up for fun jumps, the check-in flow handles identity verification, activity selection, compliance validation, and slot assignment.
## 5.1 Check-In State Machine
## 5.2 Activity Selection
Based on the athlete's profile and license level, the system presents only eligible activities:
## 5.3 Check-In Algorithm
## 5.4 Post-Check-In: Activity Selection to Manifest
Once the athlete passes all compliance checks and selects an activity, the system: (1) resolves the coaching type, (2) checks if an instructor is required, (3) auto-assigns an instructor using the skill matching algorithm from Section 4, (4) creates a coaching_session record if applicable, (5) adds the jumper to the next available load via addJumperToLoad, and (6) sends a push notification confirming their manifest status and estimated call time.
# 6. Booking Request & 24-Hour Approval Flow
When a DZ needs a specific instructor (especially part-time or freelance), they create a booking request. The instructor has 24 hours to accept or decline. If no response, the system auto-expires the request and optionally escalates to the next qualified instructor.
## 6.1 Request Lifecycle
## 6.2 Create Booking Request
## 6.3 Instructor Response
## 6.4 Auto-Expiry Cron Job
## 6.5 Escalation Chain
When a request expires, the DZ can configure auto-escalation. The system finds the next qualified instructor (using the same skill matching algorithm from Section 4, excluding the declined/expired instructor) and creates a new booking request. The escalation chain continues up to 3 attempts. After 3 failures, the DZ is notified to handle manually.
# 7. Exit Order Algorithm (9-Group System)
Exit order determines who jumps first from the aircraft. SkyLara implements the standard 9-group system used by USPA dropzones worldwide. Higher groups exit first (from highest altitude) to lowest. Within each group, the heaviest or most experienced exits first.
## 7.1 Group Definitions
## 7.2 Assignment Algorithm
## 7.3 Separation Rules
Between exit groups, the pilot maintains a minimum separation of 1,000 feet horizontal distance (approximately 5-8 seconds between groups at jump run speed of 80-90 knots). The exit order engine calculates total run time based on group count and alerts the pilot if the run exceeds the aircraft's optimal jump run length for the current wind conditions.
## 7.4 Manifest Override
Manifest staff can override any jumper's group assignment. Common overrides include moving an experienced belly flyer to the freefly group (4), or moving a CRW team to a custom separation point. Overrides are stored in slot.exit_group and take precedence over the automatic assignment.
# 8. Complete Operational Flow: A Day at the DZ
This section walks through a complete day of operations, showing how all systems interconnect.
## 8.1 Morning Setup (07:00)
DZ Operator opens operations. System runs pre_operations risk assessment (wind, weather, cloud base).
Risk assessment returns 'low' (composite score 22/100). Operations status: NORMAL.
Manifest staff creates first load: PAC 750XL (N123SL), 14,000 ft, 15 slots. Status: OPEN.
System checks instructor_availability for today (Saturday = day 5). 4 TIs available, 2 AFFIs, 1 freefly coach.
3 booking_requests from Friday auto-confirmed overnight. Coaching sessions created.
## 8.2 First Customers Arrive (08:30)
Walk-in tandem: John (first-timer). Check-in creates user + athlete records. Waiver signed on iPad. Emergency profile completed. Weight: 195 lbs. Activity: TANDEM.
System auto-assigns TI Mike (score: 95 — 0 loads today, not on active load, 18 sessions this month).
Slot created on Load #1. Mike gets instructor_assignment (role: TI).
Licensed jumper Sarah (D license, 1,200 jumps) checks in. Currency valid (jumped 3 days ago). Selects FUN_JUMP. Self-manifests on Load #1.
AFF student Alex checks in. Currency OK. System looks up aff_records: Level 5 passed. Next: Level 6. Auto-assigns AFFI Tom. Slot + coaching_session created.
## 8.3 Load Fills & CG Gate (09:15)
Load #1 now has 13/15 slots filled. Mix: 4 tandems, 2 AFF, 5 fun jumpers, 1 freefly pair, 1 hop-n-pop.
Manifest staff clicks 'Lock Load'. Status: FILLING → LOCKED.
CG auto-calculates: pilot 185 lbs + 40 gal fuel (240 lbs) + 13 jumpers (2,340 lbs avg) = 2,765 lbs payload.
CG position: 142.3" (forward limit: 138.0", aft limit: 149.0"). Result: PASS.
Auto-transition: LOCKED → 30MIN. Push + SMS sent to all 13 jumpers: '30 min call — Load #1'.
Exit order calculated: Group 9 (hop-n-pop) → 4 (freefly pair) → 3 (2 AFF) → 2 (4 tandems) → 1 (5 fun jumpers).
## 8.4 Countdown & Boarding (09:25 – 09:45)
09:25 — Timer fires: 30MIN → 20MIN. Push: '20 min call'.
09:35 — Timer fires: 20MIN → 10MIN. Push + SMS: '10 min call — report to manifest'.
Jumpers arrive at manifest. Gear checks completed. Slot status: MANIFESTED → CHECKED_IN → GEAR_CHECKED.
One jumper (fun jump) is no-show. Slot marked NO_SHOW. Waitlist notified. Next athlete claims within 5 min.
09:45 — Manifest staff: 10MIN → BOARDING. All jumpers walk to aircraft.
## 8.5 Flight & Completion (09:50 – 10:30)
09:50 — Pilot app: BOARDING → AIRBORNE. GPS tracking begins.
10:10 — All groups exited. Pilot descends.
10:25 — Aircraft lands. Pilot app: AIRBORNE → LANDED.
10:30 — Auto-finalize: LANDED → COMPLETE.
System auto-creates 13 logbook_entries. Payments settled: wallet debits, commission splits for instructors. Activity feed: '13 jumpers completed Load #1'. Tandem video uploaded to media_uploads, tagged to tandem passenger John.
## 8.6 Midday: Weather Change (13:00)
Wind increases to 18 kts gusting 24 kts. System triggers during_operations risk assessment.
Composite risk score: 72/100. Risk level: HIGH. Decision: RESTRICTIONS_APPLIED.
Restrictions: ['No student jumpers', 'No tandems', 'Licensed C+ only']. Applied system-wide.
All pending tandem/AFF slots on upcoming loads auto-cancelled with reason 'WEATHER_RESTRICTION'. Wallets credited.
14:30 — Wind drops to 11 kts. New assessment: composite 28, risk LOW. All restrictions lifted. Operations resume normal.
# 9. Error Handling & Edge Cases
# 10. System Integration Map
Summary of how all operational systems connect:

| OPEN → FILLING → LOCKED → 30MIN → 20MIN → 10MIN → BOARDING → AIRBORNE → LANDED → COMPLETE   |                   |                                                          |   +--- CANCELLED <----+------ CANCELLED (at any point before AIRBORNE) ----------+  LOCKED → 30MIN transition is BLOCKED by CG Gate (SafetyGateException) CG Gate requires: cg_checks.result = 'PASS' for this load |
| --- |

| State | Description | Who Triggers | Duration |
| --- | --- | --- | --- |
| OPEN | Load created, aircraft assigned. No jumpers yet. | Manifest staff | Until first slot added |
| FILLING | Slots being filled. Jumpers manifesting. | Auto on first slot add | Until manifest locks |
| LOCKED | No more changes. CG calculation triggered. | Manifest staff | Until CG passes |
| 30MIN | 30-minute call. Push + SMS sent to all jumpers. | CG Gate pass | 10 minutes |
| 20MIN | 20-minute call. Second notification. | Timer (auto) | 10 minutes |
| 10MIN | 10-minute call. Final warning. | Timer (auto) | 10 minutes |
| BOARDING | Jumpers gathering at aircraft. Gear check required. | Manifest staff | Until pilot signals |
| AIRBORNE | Aircraft wheels-up. GPS tracking starts. | Pilot app | ~20 min |
| LANDED | Aircraft wheels-down. | Pilot app / auto GPS | Until admin finalizes |
| COMPLETE | Load finalized. Logbook entries created. Payments settled. | Auto / manifest | Terminal |
| CANCELLED | Load cancelled. Slots released. Waitlist notified. | Manifest / operator | Terminal |

| // manifest/services/LoadFSM.ts  const TRANSITION_MAP: Record<LoadStatus, LoadStatus[]> = {   OPEN:      ['FILLING', 'CANCELLED'],   FILLING:   ['LOCKED', 'CANCELLED'],   LOCKED:    ['30MIN', 'FILLING', 'CANCELLED'],  // can unlock back to FILLING   '30MIN':   ['20MIN', 'CANCELLED'],   '20MIN':   ['10MIN', 'CANCELLED'],   '10MIN':   ['BOARDING', 'CANCELLED'],   BOARDING:  ['AIRBORNE', 'CANCELLED'],   AIRBORNE:  ['LANDED'],                          // cannot cancel mid-air   LANDED:    ['COMPLETE'],   COMPLETE:  [],                                   // terminal   CANCELLED: [],                                   // terminal };  async transition(loadId: bigint, to: LoadStatus, actor: User): Promise<Load> {   const load = await this.loadRepo.findOneOrFail(loadId, { lock: 'FOR UPDATE' });   const allowed = TRANSITION_MAP[load.status];    if (!allowed.includes(to)) {     throw new InvalidTransitionError(load.status, to);   }    // ── ROLE GATE ──   this.assertRole(actor, load, to);    // ── CG BLOCKING GATE ──   if (load.status === 'LOCKED' && to === '30MIN') {     const cg = await this.cgService.getLatestCheck(loadId);     if (!cg || cg.result !== 'PASS') {       throw new SafetyGateException('CG_NOT_PASSED', {         loadId, result: cg?.result, failReason: cg?.fail_reason       });     }     load.cg_verified_at = new Date();     load.cg_verified_by = actor.id;   }    // ── TIMESTAMP UPDATES ──   const now = new Date();   const timestampMap: Partial<Record<LoadStatus, string>> = {     '30MIN':    'call_30min_sent_at',     '20MIN':    'call_20min_sent_at',     '10MIN':    'call_10min_sent_at',     BOARDING:   'boarding_at',     AIRBORNE:   'actual_takeoff_at',     LANDED:     'actual_land_at',     COMPLETE:   'completed_at',     CANCELLED:  'cancelled_at',   };   if (timestampMap[to]) load[timestampMap[to]] = now;    load.status = to;   await this.loadRepo.save(load);    // ── SIDE EFFECTS ──   await this.emitTransitionEvents(load, to, actor);   return load; } |
| --- |

| Transition | Side Effects |
| --- | --- |
| OPEN → FILLING | WebSocket: load_updated to all connected manifest clients |
| FILLING → LOCKED | Freeze slot changes. Trigger auto CG calculation. Notify all jumpers: 'Your load is locked' |
| LOCKED → 30MIN | CG PASS required. Push + SMS: '30 min call — Load #{number}'. Start 10-min timer for 20MIN. |
| 30MIN → 20MIN | Push: '20 min call'. Timer continues. |
| 20MIN → 10MIN | Push + SMS: '10 min call — report to manifest'. Gear check deadline. |
| 10MIN → BOARDING | Push: 'BOARDING NOW'. Lock check-in. No more gear checks accepted. |
| BOARDING → AIRBORNE | GPS tracking activated. Record actual_takeoff_at. Event outbox: LOAD_AIRBORNE. |
| AIRBORNE → LANDED | GPS tracking stopped. Record actual_land_at. |
| LANDED → COMPLETE | Auto-create logbook_entries for each JUMPED slot. Settle payments. Commission splits. Event outbox: LOAD_COMPLETE. Activity feed entries. |
| Any → CANCELLED | Release all slots. Credit wallets/tickets. Notify all jumpers + waitlist. Record cancellation_reason. |

| // manifest/services/ManifestEngine.ts  async createLoad(input: CreateLoadInput, actor: User): Promise<Load> {   // 1. Validate aircraft availability   const aircraft = await this.aircraftRepo.findOneOrFail(input.aircraftId);   if (aircraft.status !== 'active') {     throw new AircraftUnavailableError(aircraft.id, aircraft.status);   }    // 2. Check no active load on this aircraft   const activeLoad = await this.loadRepo.findActive(aircraft.id);   if (activeLoad) {     throw new AircraftBusyError(aircraft.id, activeLoad.id);   }    // 3. Validate altitude within aircraft limits   if (input.altitudeFt > aircraft.max_altitude_ft) {     throw new AltitudeExceedsLimitError(input.altitudeFt, aircraft.max_altitude_ft);   }    // 4. Create load   const load = await this.loadRepo.create({     uuid: uuidv4(),     dropzone_id: actor.activeDropzoneId,     branch_id: input.branchId ?? null,     aircraft_id: aircraft.id,     altitude_ft: input.altitudeFt,     slot_count: input.slotCount ?? aircraft.max_seats,     slots_filled: 0,     status: 'OPEN',     scheduled_call_time: input.scheduledCallTime ?? null,     created_by: actor.id,   });    // 5. Emit event   await this.events.emit('load.created', { loadId: load.id, dzId: load.dropzone_id });   await this.ws.broadcast(load.dropzone_id, 'load_board_update', { action: 'CREATED', load });   return load; } |
| --- |

| async addJumperToLoad(input: AddJumperInput, actor: User): Promise<Slot> {   const load = await this.loadRepo.findOneOrFail(input.loadId, { lock: 'FOR UPDATE' });    // ── GATE 1: Load status ──   if (!['OPEN', 'FILLING'].includes(load.status)) {     throw new LoadNotAcceptingJumpersError(load.id, load.status);   }    // ── GATE 2: Capacity ──   if (load.slots_filled >= load.slot_count) {     // Auto-add to waitlist if enabled     if (input.autoWaitlist) {       return this.waitlistService.addToWaitlist(load.id, input.athleteId, input.jumpType);     }     throw new LoadFullError(load.id);   }    // ── GATE 3: Athlete compliance ──   const athlete = await this.athleteRepo.findOneOrFail(input.athleteId);   await this.complianceService.validateForJump(athlete, input.jumpType, load.dropzone_id);   //   → checks: waiver signed, currency valid, license level, weight limits, USPA active    // ── GATE 4: Instructor requirement ──   let instructorId: bigint | null = null;   if (['TANDEM', 'AFF'].includes(input.jumpType)) {     instructorId = input.instructorId       ?? (await this.instructorService.autoAssign(load, input.jumpType, athlete)).id;     if (!instructorId) throw new NoInstructorAvailableError(input.jumpType);   }    // ── GATE 5: Weight check (for overweight tandems) ──   const dz = await this.dzRepo.findOneOrFail(load.dropzone_id);   if (input.jumpType === 'TANDEM' && athlete.weight_lbs) {     if (athlete.weight_lbs > dz.tandem_weight_limit_lbs) {       // Require OVERWEIGHT-certified instructor       const hasSkill = await this.instructorService.hasSkill(         instructorId!, 'OVERWEIGHT', load.dropzone_id       );       if (!hasSkill) throw new OverweightInstructorRequiredError(athlete.weight_lbs);     }   }    // ── CREATE SLOT ──   const slot = await this.slotRepo.create({     uuid: uuidv4(),     load_id: load.id,     athlete_id: input.athleteId,     jump_type: input.jumpType,     altitude_ft: input.altitudeFt ?? load.altitude_ft,     instructor_id: instructorId,     price_cents: await this.pricingService.resolve(load.dropzone_id, input.jumpType, input.altitudeFt),     status: 'MANIFESTED',     created_by: actor.id,   });    // ── UPDATE LOAD ──   load.slots_filled += 1;   if (load.status === 'OPEN') load.status = 'FILLING';   await this.loadRepo.save(load);    // ── INSTRUCTOR ASSIGNMENT RECORD ──   if (instructorId) {     await this.instructorAssignmentRepo.create({       load_id: load.id, instructor_id: instructorId,       dropzone_id: load.dropzone_id,       role: input.jumpType === 'TANDEM' ? 'TI' : 'AFFI',       assigned_by: actor.id, status: 'assigned',     });   }    await this.ws.broadcast(load.dropzone_id, 'load_board_update', {     action: 'SLOT_ADDED', loadId: load.id, slot   });   return slot; } |
| --- |

| async removeJumperFromLoad(slotId: bigint, reason: string, actor: User): Promise<void> {   const slot = await this.slotRepo.findOneOrFail(slotId, { lock: 'FOR UPDATE' });   const load = await this.loadRepo.findOneOrFail(slot.load_id, { lock: 'FOR UPDATE' });    // Can only remove before BOARDING   if (['BOARDING','AIRBORNE','LANDED','COMPLETE','CANCELLED'].includes(load.status)) {     throw new CannotModifyLoadError(load.status);   }    // Cancel slot   slot.status = 'CANCELLED';   slot.notes = reason;   await this.slotRepo.save(slot);    // Update load count   load.slots_filled = Math.max(0, load.slots_filled - 1);   await this.loadRepo.save(load);    // Release instructor assignment   if (slot.instructor_id) {     await this.instructorAssignmentRepo.updateStatus(       load.id, slot.instructor_id, 'declined'     );   }    // Credit wallet/ticket if pre-paid   if (slot.ticket_id) {     await this.ticketService.refundSlot(slot);   } else if (slot.price_cents > 0) {     await this.walletService.credit(slot.athlete_id, load.dropzone_id,       slot.price_cents, 'SLOT_CANCEL_REFUND', { slotId: slot.id });   }    // Notify waitlist   await this.waitlistService.notifyNextInLine(load.id);    await this.ws.broadcast(load.dropzone_id, 'load_board_update', {     action: 'SLOT_REMOVED', loadId: load.id, slotId: slot.id   }); } |
| --- |

| Event | Payload | Trigger |
| --- | --- | --- |
| load_board_update | { action, loadId, slot?, load? } | Any load/slot mutation |
| load_status_changed | { loadId, from, to, actor } | FSM transition |
| call_time_alert | { loadId, callType: '30MIN'|'20MIN'|'10MIN' } | Timer-driven |
| cg_result | { loadId, result: 'PASS'|'MARGINAL'|'FAIL', details } | CG calculation complete |
| waitlist_notification | { loadId, athleteId, position, claimDeadline } | Slot opened on waitlisted load |

| // safety/services/CGCalculator.ts  interface CGInput {   aircraft: Aircraft;            // CG envelope, empty weight, limits   pilotWeight: number;           // lbs   fuelWeight: number;            // lbs (fuel onboard at takeoff)   jumpers: JumperWeight[];       // { seatPosition, weight, gearWeight } }  interface CGResult {   result: 'PASS' | 'MARGINAL' | 'FAIL';   totalPayload: number;          // lbs   calculatedCG: number;          // inches from datum   forwardLimit: number;          // from aircraft   aftLimit: number;              // from aircraft   payloadUtilization: number;    // percentage   failReason: string | null; }  calculate(input: CGInput): CGResult {   const { aircraft, pilotWeight, fuelWeight, jumpers } = input;    // 1. Total weight   const totalJumperWeight = jumpers.reduce((sum, j) => sum + j.weight + j.gearWeight, 0);   const totalPayload = pilotWeight + fuelWeight + totalJumperWeight;   const grossWeight = aircraft.empty_weight_lbs + totalPayload;    // 2. Weight check   if (grossWeight > aircraft.max_tow_lbs) {     return {       result: 'FAIL',       totalPayload,       calculatedCG: 0,       forwardLimit: aircraft.cg_fwd_limit,       aftLimit: aircraft.cg_aft_limit,       payloadUtilization: (totalPayload / aircraft.usable_payload_lbs) * 100,       failReason: `Gross weight ${grossWeight} lbs exceeds MTOW ${aircraft.max_tow_lbs} lbs`,     };   }    // 3. Moment calculation (simplified — real DZs use arm charts)   //    Moment = weight * arm (distance from datum in inches)   //    CG = total_moment / gross_weight   const emptyMoment = aircraft.empty_weight_lbs * aircraft.cg_datum_arm;   const pilotMoment = pilotWeight * aircraft.pilot_arm;   const fuelMoment = fuelWeight * aircraft.fuel_arm;   const jumperMoments = jumpers.reduce(     (sum, j) => sum + (j.weight + j.gearWeight) * this.getSeatArm(aircraft, j.seatPosition),     0   );   const totalMoment = emptyMoment + pilotMoment + fuelMoment + jumperMoments;   const calculatedCG = totalMoment / grossWeight;    // 4. CG envelope check   const fwd = aircraft.cg_fwd_limit;   const aft = aircraft.cg_aft_limit;   const margin = (aft - fwd) * 0.1; // 10% margin for MARGINAL    let result: 'PASS' | 'MARGINAL' | 'FAIL';   let failReason: string | null = null;    if (calculatedCG < fwd || calculatedCG > aft) {     result = 'FAIL';     failReason = calculatedCG < fwd       ? `CG ${calculatedCG.toFixed(2)}" is forward of limit ${fwd}"`       : `CG ${calculatedCG.toFixed(2)}" is aft of limit ${aft}"`;   } else if (calculatedCG < fwd + margin || calculatedCG > aft - margin) {     result = 'MARGINAL';     failReason = 'CG within envelope but within 10% of limits';   } else {     result = 'PASS';   }    return {     result, totalPayload, calculatedCG,     forwardLimit: fwd, aftLimit: aft,     payloadUtilization: (totalPayload / aircraft.usable_payload_lbs) * 100,     failReason,   }; } |
| --- |

| CG Result | FSM Action | Notification |
| --- | --- | --- |
| PASS | Auto-advance to 30MIN. Record cg_verified_at. | Green banner on load board. 30-min call sent. |
| MARGINAL | Block. Require manifest staff manual review + explicit confirm. | Yellow warning. Staff must click 'Confirm CG' to proceed. |
| FAIL | Block. Cannot advance. Must modify load. | Red alert. 'CG FAIL — [reason]'. Override requires operator role. |

| // operations/services/InstructorService.ts  async autoAssign(   load: Load,   jumpType: JumpType,   athlete: Athlete ): Promise<User> {   const dzId = load.dropzone_id;   const now = new Date();   const dayOfWeek = (now.getDay() + 6) % 7; // 0=Mon   const currentTime = format(now, 'HH:mm:ss');    // ── STEP 1: Determine required skills ──   const requiredSkills: string[] = [];    // Base skill from coaching type   const coachingType = await this.coachingTypeRepo.findByJumpType(jumpType);   if (coachingType?.required_skill_type_id) {     const skillType = await this.skillTypeRepo.findOne(coachingType.required_skill_type_id);     requiredSkills.push(skillType.code);   }    // Special skills based on athlete profile   const dz = await this.dzRepo.findOne(dzId);   if (jumpType === 'TANDEM') {     if (athlete.weight_lbs && athlete.weight_lbs > dz.tandem_weight_limit_lbs) {       requiredSkills.push('OVERWEIGHT');     }     if (athlete.has_disability_flag) {       requiredSkills.push('HANDICAP');     }   }    // ── STEP 2: Query eligible instructors ──   // Must have ALL required skills, active status, available today   const eligible = await this.db.selectFrom('users')     .innerJoin('instructor_skills AS is', 'is.user_id', 'users.id')     .innerJoin('instructor_skill_types AS ist', 'ist.id', 'is.skill_type_id')     .innerJoin('instructor_availability AS ia', 'ia.user_id', 'users.id')     .where('is.dropzone_id', '=', dzId)     .where('is.status', '=', 'active')     .where('ia.dropzone_id', '=', dzId)     .where('ia.day_of_week', '=', dayOfWeek)     .where('ia.available_from', '<=', currentTime)     .where('ia.available_to', '>=', currentTime)     .where('ia.is_active', '=', true)     .where(eb => eb.or([       eb('ia.effective_to', 'is', null),       eb('ia.effective_to', '>=', format(now, 'yyyy-MM-dd')),     ]))     .groupBy('users.id')     .having(       eb => eb.fn.count(         eb.case()           .when('ist.code', 'in', requiredSkills)           .then(1)           .end()       ), '>=', requiredSkills.length     )     .select(['users.id', 'users.first_name', 'users.last_name'])     .execute();    if (eligible.length === 0) return null;    // ── STEP 3: Score & rank ──   const scored = await Promise.all(eligible.map(async (inst) => {     const todayLoads = await this.getInstructorLoadCountToday(inst.id, dzId);     const activeOnLoad = await this.isOnActiveLoad(inst.id);     const totalSessions = await this.getTotalSessions(inst.id, dzId, 30); // last 30 days     return {       ...inst,       score: this.calculateScore(todayLoads, activeOnLoad, totalSessions),     };   }));    // Sort: highest score first (lower workload = higher score)   scored.sort((a, b) => b.score - a.score);   return scored[0]; }  private calculateScore(   todayLoads: number,   isOnActiveLoad: boolean,   monthSessions: number ): number {   let score = 100;   score -= todayLoads * 15;       // Fewer loads today = preferred   if (isOnActiveLoad) score -= 50; // Currently busy = deprioritized   score -= monthSessions * 0.5;    // Even distribution across month   return Math.max(0, score); } |
| --- |

| Activity Type | Required Skill | Max Students | Instructor Required | Notes |
| --- | --- | --- | --- | --- |
| TANDEM | TI rating (implicit) | 1 | Yes | OVERWEIGHT / HANDICAP if applicable |
| AFF | AFF | 1 | Yes | Per-level progression tracking |
| COACHING_BASIC | COACH | 1 | Yes | Post-AFF fundamentals |
| COACHING_ADVANCE | COACH | 1 | Yes | Advanced canopy, formations |
| GROUP_COACHING | COACH | No limit | Yes | Multiple students per session |
| FREEFLY_COACHING | FREEFLY | 2 | Yes | Head-up/head-down training |
| CAMERA_COACHING | CAMERA | 1 | Yes | Camera flying technique |
| FUN_JUMP | None | N/A | No | Licensed jumpers, self-manifest |
| HOP_POP | None | N/A | No | Low-altitude deployment |
| WINGSUIT | WINGSUIT (for coaching only) | N/A | No | Requires 200+ jumps |

| Type | Availability | Assignment | Booking Requests |
| --- | --- | --- | --- |
| Full-Time | DZ sets default schedule. Instructor confirms. | Auto-assigned by manifest. | Not required — always on schedule. |
| Part-Time | Instructor sets own windows (day + time range). | Auto-assigned during windows. | 24h request for outside-window work. |
| Freelance | No default. Available on-request only. | Never auto-assigned. | Always requires booking request. |
| Seasonal | Active during effective_from to effective_to. | Auto-assigned within season. | Off-season requires booking request. |

| IDENTIFY → SELECT_ACTIVITY → VALIDATE → ASSIGN_INSTRUCTOR → MANIFEST → GEAR_CHECK → READY                                     |                               COMPLIANCE_HOLD  (waiver, currency, weight, USPA) |
| --- |

| Athlete Type | Available Activities | Validation |
| --- | --- | --- |
| First-timer (no account) | TANDEM only | Create account, sign waiver, weight check, emergency profile |
| AFF Student (active) | AFF (next level), TANDEM | Currency check (30-day recency), waiver current, AFF record lookup for next level |
| Licensed A/B | FUN_JUMP, HOP_POP, COACHING_BASIC, COACHING_ADVANCE, GROUP_COACHING | Currency (60-day), license active, USPA active |
| Licensed C/D | All above + FREEFLY_COACHING, CAMERA_COACHING | Currency (90-day C, 180-day D), license, USPA |
| Licensed D + 200 jumps | All above + WINGSUIT | 200 jump minimum, currency, license, USPA |
| Instructor | All above + may work as TI/AFFI/COACH | Rating current, skills verified, availability window |

| // checkin/services/CheckInService.ts  async checkIn(input: CheckInInput): Promise<CheckInResult> {   // ── STEP 1: IDENTIFY ──   let athlete = await this.athleteRepo.findByUserAndDz(input.userId, input.dropzoneId);   if (!athlete) {     // First visit to this DZ — create athlete record     athlete = await this.athleteRepo.createForDz(input.userId, input.dropzoneId);   }    // ── STEP 2: COMPLIANCE CHECKS (run all, collect all failures) ──   const checks: ComplianceCheck[] = [];    // 2a. Waiver   const waiverOk = await this.waiverService.hasCurrentSignature(     input.userId, input.dropzoneId   );   checks.push({ type: 'WAIVER', passed: waiverOk,     action: waiverOk ? null : 'SIGN_WAIVER' });    // 2b. Emergency profile   const hasEmergency = await this.emergencyService.hasProfile(input.userId);   checks.push({ type: 'EMERGENCY_PROFILE', passed: hasEmergency,     action: hasEmergency ? null : 'COMPLETE_EMERGENCY_PROFILE' });    // 2c. Currency (recency)   if (athlete.license_level && athlete.license_level !== 'STUDENT') {     const currencyOk = await this.currencyService.check(       athlete, input.dropzoneId     );     checks.push({ type: 'CURRENCY', passed: currencyOk.valid,       action: currencyOk.valid ? null : 'CURRENCY_EXPIRED',       detail: currencyOk.detail });   }    // 2d. USPA membership (if US DZ)   const dz = await this.dzRepo.findOne(input.dropzoneId);   if (dz.country_code === 'US' && athlete.uspa_member_number) {     const uspaOk = await this.uspaService.verify(athlete.uspa_member_number);     checks.push({ type: 'USPA', passed: uspaOk.active,       action: uspaOk.active ? null : 'USPA_EXPIRED' });   }    // 2e. Weight verification (if DZ requires it)   if (dz.require_weight_verification) {     const weighed = input.verifiedWeightLbs != null;     checks.push({ type: 'WEIGHT', passed: weighed,       action: weighed ? null : 'WEIGH_IN_REQUIRED' });     if (weighed) {       athlete.weight_lbs = input.verifiedWeightLbs;       await this.athleteRepo.save(athlete);     }   }    // ── STEP 3: DETERMINE ELIGIBLE ACTIVITIES ──   const activities = await this.getEligibleActivities(athlete, input.dropzoneId);    // ── STEP 4: RETURN RESULT ──   const allPassed = checks.every(c => c.passed);   return {     athlete,     complianceChecks: checks,     allCompliancePassed: allPassed,     eligibleActivities: allPassed ? activities : [],     blockers: checks.filter(c => !c.passed),   }; } |
| --- |

| PENDING → ACCEPTED   (instructor accepts within 24h)    |                      +→ DECLINED    (instructor declines)    |    +→ EXPIRED     (24h passed, no response — auto by cron)    |    +→ CANCELLED   (DZ cancels before response) |
| --- |

| // operations/services/BookingRequestService.ts  async createRequest(input: CreateBookingRequestInput, actor: User): Promise<BookingRequest> {   const instructor = await this.userRepo.findOneOrFail(input.instructorId);   const coachingType = await this.coachingTypeRepo.findOneOrFail(input.coachingTypeId);    // Validate instructor has required skill   if (coachingType.required_skill_type_id) {     const hasSkill = await this.instructorService.hasSkill(       instructor.id, coachingType.required_skill_type_id, input.dropzoneId     );     if (!hasSkill) {       throw new InstructorMissingSkillError(instructor.id, coachingType.code);     }   }    // Check for conflicting requests on same date   const existing = await this.requestRepo.findPendingForInstructor(     instructor.id, input.requestedDate   );   if (existing.length > 0) {     throw new ConflictingRequestError(instructor.id, input.requestedDate);   }    // Create with 24h expiry   const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);    const request = await this.requestRepo.create({     uuid: uuidv4(),     dropzone_id: input.dropzoneId,     booking_id: input.bookingId ?? null,     coaching_type_id: input.coachingTypeId,     requested_instructor_id: instructor.id,     requested_by: actor.id,     customer_id: input.customerId ?? null,     requested_date: input.requestedDate,     requested_time_from: input.timeFrom ?? null,     requested_time_to: input.timeTo ?? null,     message: input.message ?? null,     status: 'pending',     expires_at: expiresAt,   });    // Push + SMS to instructor   await this.notifyService.send(instructor.id, 'BOOKING_REQUEST', {     dzName: (await this.dzRepo.findOne(input.dropzoneId)).name,     activityType: coachingType.name,     date: input.requestedDate,     expiresAt,     requestId: request.uuid,   });    return request; } |
| --- |

| async respond(   requestId: bigint,   response: 'accepted' | 'declined',   message: string | null,   actor: User ): Promise<BookingRequest> {   const request = await this.requestRepo.findOneOrFail(requestId, { lock: 'FOR UPDATE' });    if (request.status !== 'pending') {     throw new RequestNotPendingError(request.status);   }   if (request.requested_instructor_id !== actor.id) {     throw new UnauthorizedError('Only the requested instructor can respond');   }    request.status = response;   request.response_message = message;   request.responded_at = new Date();   await this.requestRepo.save(request);    if (response === 'accepted') {     // Auto-create coaching session     await this.coachingSessionService.createFromRequest(request);     // Notify DZ + customer     await this.notifyService.send(request.requested_by, 'BOOKING_ACCEPTED', { request });     if (request.customer_id) {       await this.notifyService.send(request.customer_id, 'BOOKING_CONFIRMED', { request });     }   } else {     // Notify DZ of decline — suggest auto-escalation     await this.notifyService.send(request.requested_by, 'BOOKING_DECLINED', {       request, suggestAlternatives: true     });   }   return request; } |
| --- |

| // cron/jobs/expireBookingRequests.ts // Runs every 60 seconds  async execute(): Promise<void> {   const expired = await this.db     .updateTable('booking_requests')     .set({       status: 'expired',       auto_expired: true,       updated_at: new Date(),     })     .where('status', '=', 'pending')     .where('expires_at', '<=', new Date())     .returning(['id', 'requested_by', 'requested_instructor_id', 'dropzone_id'])     .execute();    for (const req of expired) {     await this.notifyService.send(req.requested_by, 'BOOKING_EXPIRED', { requestId: req.id });     // Optionally auto-escalate to next available instructor     if (this.dzSettings.autoEscalateOnExpiry(req.dropzone_id)) {       await this.escalateToNextInstructor(req.id);     }   }   if (expired.length > 0) {     this.logger.info(`Auto-expired ${expired.length} booking requests`);   } } |
| --- |

| Group | Exit Order | Type | Typical Altitude | Fall Rate |
| --- | --- | --- | --- | --- |
| 9 | 1st (highest) | High-pull / hop-n-pop | 5,000 ft | Fastest under canopy |
| 8 | 2nd | Wingsuit | Full altitude | Slowest freefall |
| 7 | 3rd | Tracking / angle | Full altitude | Fast horizontal |
| 6 | 4th | Large formation (8+) | Full altitude | Slow freefall |
| 5 | 5th | Small formation (4-7) | Full altitude | Medium freefall |
| 4 | 6th | Freefly (head-down) | Full altitude | Fast freefall |
| 3 | 7th | AFF students | Full altitude | Instructor-controlled |
| 2 | 8th | Tandem (instructor + passenger) | Full altitude | Slow freefall + drogue |
| 1 | 9th (last) | Solo belly / coach | Full altitude | Standard freefall |

| // manifest/services/ExitOrderEngine.ts  const JUMP_TYPE_TO_GROUP: Record<string, number> = {   HOP_POP:    9,   WINGSUIT:   8,   CRW:        7,  // canopy relative work = tracking group   FUN_JUMP:   5,  // default — manifest can override to 4/5/6   FREEFLY:    4,   AFF:        3,   TANDEM:     2,   COACH:      1, };  async calculateExitOrder(loadId: bigint): Promise<ExitOrderResult[]> {   const slots = await this.slotRepo.findByLoad(loadId, {     where: { status: ['MANIFESTED', 'CHECKED_IN', 'GEAR_CHECKED'] },     relations: ['athlete'],   });    // 1. Assign groups   const grouped: Map<number, Slot[]> = new Map();   for (const slot of slots) {     const group = slot.exit_group_override       ?? JUMP_TYPE_TO_GROUP[slot.jump_type]       ?? 5; // default to formation group     if (!grouped.has(group)) grouped.set(group, []);     grouped.get(group)!.push(slot);   }    // 2. Sort groups descending (9 exits first, 1 exits last)   const sortedGroups = [...grouped.entries()]     .sort(([a], [b]) => b - a);    // 3. Within each group: heaviest first (more separation)   const result: ExitOrderResult[] = [];   let exitPosition = 1;    for (const [groupNum, groupSlots] of sortedGroups) {     groupSlots.sort((a, b) => {       const wA = a.athlete?.weight_lbs ?? 180;       const wB = b.athlete?.weight_lbs ?? 180;       return wB - wA; // heaviest first     });      let positionInGroup = 1;     for (const slot of groupSlots) {       slot.exit_group = groupNum;       slot.exit_order_in_group = positionInGroup;       await this.slotRepo.save(slot);       result.push({         slotId: slot.id,         athleteName: `${slot.athlete.first_name} ${slot.athlete.last_name}`,         jumpType: slot.jump_type,         exitGroup: groupNum,         positionInGroup: positionInGroup,         overallPosition: exitPosition,       });       positionInGroup++;       exitPosition++;     }   }    return result; } |
| --- |

| Scenario | System Response |
| --- | --- |
| Instructor declines mid-load (before LOCKED) | System auto-reassigns using skill matching. If no alternative, alert manifest staff. |
| CG FAIL after load locked | Block 30MIN transition. Manifest staff must remove heaviest jumper or swap aircraft. |
| Tandem passenger exceeds weight limit | Check-in blocks TANDEM activity. Offer FUN_JUMP if licensed, otherwise reject with message. |
| AFF student fails same level 3 times | System flags for safety review. Requires DZ operator sign-off before next attempt. |
| Instructor certification expired | instructor_skills.status auto-set to 'expired' by nightly cron. Instructor cannot be assigned. |
| All TIs busy (on active loads) | Queue tandem for next load. Push to manifest: 'No TI available for next 20 min'. |
| Aircraft goes maintenance mid-day | All loads on that aircraft cancelled. Jumpers redistributed to other aircraft loads. |
| Internet connectivity lost (offline mode) | WatermelonDB / IndexedDB takes over. All changes synced when connection restored. Conflict resolution: server wins for financial, last-write-wins for notes. |
| Booking request expires + no alternatives | DZ notified. Customer notified with apology + option to rebook different date. |
| Jumper tries to manifest on 2 loads simultaneously | Unique constraint (load_id, athlete_id) per load, plus app-level check across active loads. |
| Wind exceeds DZ limit during active load | Cannot cancel AIRBORNE load. Alert pilot. Post-landing: trigger incident assessment. |
| Double-charge on wallet | Transactions are append-only. Refund creates new CREDIT transaction. Idempotency key prevents duplicates. |

| System | Consumes From | Produces To | Real-Time Channel |
| --- | --- | --- | --- |
| Manifest Engine | Instructor Service, Compliance, Pricing | Load Board, Notifications, Logbook | WebSocket: load_board_update |
| Load FSM | CG Calculator, Timer Cron | Event Outbox, Notifications | WebSocket: load_status_changed |
| CG Calculator | Aircraft data, Slot weights | CG Result → FSM gate | WebSocket: cg_result |
| Instructor Service | Skills, Availability, Workload | Assignments, Coaching Sessions | Push: assignment_notification |
| Check-In Service | Compliance, Waivers, Emergency | Eligible Activities → Manifest | N/A (request-response) |
| Booking Requests | Instructor Service, Coaching Types | Coaching Sessions, Notifications | Push: booking_request |
| Exit Order Engine | Slots, Jump Types, Weights | Exit groups on slots | WebSocket: exit_order_update |
| Risk Assessment | Weather Data, DZ limits | Restrictions, Weather Holds | WebSocket: risk_assessment_update |
| Approval Cron | booking_requests table | Expired requests, Escalations | Push: booking_expired |