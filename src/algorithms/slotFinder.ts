/**
 * Slot Finding Algorithms
 *
 * Core algorithms for finding available interview slots with multiple interviewers,
 * handling multi-day interviews, and respecting complex constraints.
 *
 * Key Algorithms:
 * 1. Single-day slot finding with backtracking
 * 2. Multi-day slot finding with recursive round scheduling
 * 3. Interviewer combination generation
 * 4. Load-balanced slot selection
 */

import type {
  InterviewSession,
  Interviewer,
  SessionCombination,
  InterviewSlot,
  MultiDayPlan,
  RoundPlan,
  CalendarEvent,
  SchedulingOptions,
  SlotConflict,
  LoadInfo,
} from '../types';
import { addDays, addMinutes, isBefore, isEqual } from 'date-fns';
import {
  isTimeOverlap,
  subtractTimeChunks,
  getTotalDuration,
} from '../utils/conflictDetection';
import { isInterviewerAvailable } from '../utils/availabilityCheck';
import { calculateInterviewerLoad } from '../utils/loadCalculation';
import { MINUTES_IN_DAY, DEFAULT_APPOINTMENT_START_TIME } from '../constants';

/**
 * Find all available slots for a single day
 *
 * Uses backtracking to explore all valid interviewer combinations
 * for each session, then finds non-conflicting time slots.
 *
 * Algorithm:
 * 1. Group sessions by rounds (sessions with breaks < 1 day are in same round)
 * 2. Generate interviewer combinations for each session
 * 3. For each combination, calculate start times with proper breaks
 * 4. Filter by conflicts (calendar, work hours, load limits)
 * 5. Sort by start time and load density
 *
 * Time Complexity: O(C^S * I * E)
 * where C = avg combinations per session,
 *       S = number of sessions,
 *       I = number of interviewers,
 *       E = calendar events per interviewer
 *
 * @param sessions - Interview sessions to schedule
 * @param interviewers - Available interviewers
 * @param date - Date to find slots for (YYYY-MM-DD)
 * @param calendarEvents - Map of interviewer ID to their calendar events
 * @param options - Scheduling options/filters
 * @returns Array of valid session combinations
 */
export async function findSlotsForDay(
  sessions: InterviewSession[],
  interviewers: Interviewer[],
  date: string,
  calendarEvents: Map<string, CalendarEvent[]>,
  options: SchedulingOptions = {}
): Promise<SessionCombination[]> {
  // Sort sessions by order
  const sortedSessions = [...sessions].sort((a, b) => a.order - b.order);

  // Generate interviewer combinations for each session
  const sessionCombinations = generateInterviewerCombinations(
    sortedSessions,
    interviewers,
    options
  );

  // Generate all possible slot combinations
  const slotCombinations = await generateAllSlotCombinations(
    sortedSessions,
    sessionCombinations,
    interviewers,
    date,
    calendarEvents,
    options
  );

  // Sort by start time and load density
  return slotCombinations.sort((a, b) => {
    // Primary sort: start time
    if (a.startTime !== b.startTime) {
      return a.startTime.localeCompare(b.startTime);
    }

    // Secondary sort: average load density (prefer lower load)
    const avgDensityA = getAverageLoadDensity(a.loadDensity);
    const avgDensityB = getAverageLoadDensity(b.loadDensity);
    return avgDensityA - avgDensityB;
  });
}

async function generateAllSlotCombinations(
  sortedSessions: InterviewSession[],
  sessionCombinations: Map<string, Interviewer[][]>,
  interviewers: Interviewer[],
  date: string,
  calendarEvents: Map<string, CalendarEvent[]>,
  options: SchedulingOptions
): Promise<SessionCombination[]> {
  const slotCombinations: SessionCombination[] = [];
  await exploreSlotCombinations(
    sortedSessions,
    sessionCombinations,
    interviewers,
    date,
    calendarEvents,
    options,
    [],
    0,
    slotCombinations
  );
  return slotCombinations;
}

/**
 * Find slots for multi-day interviews
 *
 * Recursively schedules each round on available days with proper gaps.
 *
 * Algorithm:
 * 1. Group sessions into rounds based on break duration
 * 2. For round 0, find all valid days in date range
 * 3. For each valid day, recursively schedule next rounds
 * 4. Maintain gap between rounds based on break duration
 * 5. Verify no interviewer conflicts across rounds
 *
 * Time Complexity: O(D^R * C^S)
 * where D = days in range,
 *       R = number of rounds,
 *       C = combinations per session,
 *       S = sessions per round
 *
 * @param sessions - Interview sessions (will be grouped into rounds)
 * @param interviewers - Available interviewers
 * @param dateRange - Start and end dates
 * @param calendarEvents - Calendar events for conflict checking
 * @param options - Scheduling options
 * @returns Array of multi-day plans
 */
export async function findMultiDaySlots(
  sessions: InterviewSession[],
  interviewers: Interviewer[],
  dateRange: { start: string; end: string },
  calendarEvents: Map<string, CalendarEvent[]>,
  options: SchedulingOptions = {}
): Promise<MultiDayPlan[]> {
  // Group sessions into rounds
  const rounds = groupSessionsIntoRounds(sessions);

  // Track results
  const multiDayPlans: MultiDayPlan[] = [];

  // Start recursive backtracking from first round
  await findRoundSlots(
    rounds,
    0,
    [],
    dateRange.start,
    dateRange.end,
    interviewers,
    calendarEvents,
    options,
    multiDayPlans
  );

  return multiDayPlans;
}

/**
 * Recursive function to find slots for each round
 *
 * Backtracking algorithm that tries each valid day for current round,
 * then recursively schedules remaining rounds.
 */
async function findRoundSlots(
  rounds: InterviewSession[][],
  currentRoundIndex: number,
  previousRounds: RoundPlan[],
  startDate: string,
  endDate: string,
  interviewers: Interviewer[],
  calendarEvents: Map<string, CalendarEvent[]>,
  options: SchedulingOptions,
  results: MultiDayPlan[]
): Promise<void> {
  // Base case: all rounds scheduled
  if (currentRoundIndex >= rounds.length) {
    const plan: MultiDayPlan = {
      id: generatePlanId(previousRounds),
      rounds: previousRounds,
      totalRounds: rounds.length,
      allInterviewers: extractAllInterviewers(previousRounds),
    };
    results.push(plan);

    // Limit results if specified
    if (options.maxResults && results.length >= options.maxResults) {
      return;
    }
    return;
  }

  const currentRoundSessions = rounds[currentRoundIndex];

  // Calculate gap from previous round
  let searchStartDate = startDate;
  if (previousRounds.length > 0) {
    const lastRound = previousRounds[previousRounds.length - 1];
    const lastSession = currentRoundSessions[0];
    const gapDays = Math.ceil(lastSession.breakAfter / MINUTES_IN_DAY);
    searchStartDate = addDays(lastRound.date, gapDays);
  }

  // Try each day in range for this round
  let currentDate = new Date(searchStartDate);
  const end = new Date(endDate);
  while (isBefore(currentDate, end) || isEqual(currentDate, end)) {
    await findSlotsForRound(
      currentDate,
      currentRoundSessions,
      interviewers,
      calendarEvents,
      options,
      previousRounds,
      rounds,
      currentRoundIndex,
      startDate,
      endDate,
      results
    );

    // Check if we've found enough results
    if (options.maxResults && results.length >= options.maxResults) {
      return;
    }

    // Move to next day
    currentDate = addDays(currentDate, 1);
  }
}

async function findSlotsForRound(
  currentDate: Date,
  currentRoundSessions: InterviewSession[],
  interviewers: Interviewer[],
  calendarEvents: Map<string, CalendarEvent[]>,
  options: SchedulingOptions,
  previousRounds: RoundPlan[],
  rounds: InterviewSession[][],
  currentRoundIndex: number,
  startDate: string,
  endDate: string,
  results: MultiDayPlan[]
) {
  const daySlots = await findSlotsForDay(
    currentRoundSessions,
    interviewers,
    currentDate.toISOString().split('T')[0],
    calendarEvents,
    options
  );

  // For each valid slot, recursively try next rounds
  for (const slotCombo of daySlots) {
    // Verify no conflicts with previous rounds' interviewers
    if (hasInterviewerConflictWithPreviousRounds(slotCombo, previousRounds)) {
      continue;
    }

    const roundPlan: RoundPlan = {
      roundNumber: currentRoundIndex,
      date: currentDate.toISOString().split('T')[0],
      combination: slotCombo,
      sessions: currentRoundSessions,
    };

    // Recursively schedule next rounds
    await findRoundSlots(
      rounds,
      currentRoundIndex + 1,
      [...previousRounds, roundPlan],
      startDate,
      endDate,
      interviewers,
      calendarEvents,
      options,
      results
    );

    // Check if we've found enough results
    if (options.maxResults && results.length >= options.maxResults) {
      return;
    }
  }
}

/**
 * Generate all valid combinations of interviewers for each session
 *
 * For a session requiring N interviewers, generates all C(total, N) combinations
 * from the available interviewer pool.
 *
 * Time Complexity: O(C(I, N)) per session
 * where I = interviewers in pool,
 *       N = required interviewers
 *
 * @param sessions - Interview sessions
 * @param interviewers - All available interviewers
 * @param options - Scheduling options
 * @returns Map of session ID to array of interviewer combinations
 */
export function generateInterviewerCombinations(
  sessions: InterviewSession[],
  interviewers: Interviewer[],
  options: SchedulingOptions = {}
): Map<string, Interviewer[][]> {
  const combinations = new Map<string, Interviewer[][]>();

  for (const session of sessions) {
    // Filter interviewer pool for this session
    let pool = interviewers;
    if (session.interviewerPool) {
      pool = interviewers.filter(int => session.interviewerPool!.includes(int.id));
    }

    // Filter out training interviewers if not allowed
    if (!options.includeTrainingInterviewers) {
      pool = pool.filter(int => !int.isTraining);
    }

    // Generate combinations
    const sessionCombos = generateCombinations(pool, session.requiredInterviewers);

    // Optionally add combinations with training interviewers
    if (options.includeTrainingInterviewers) {
      const withTraining = generateCombinationsWithTraining(
        pool,
        session.requiredInterviewers
      );
      sessionCombos.push(...withTraining);
    }

    combinations.set(session.id, sessionCombos);
  }

  return combinations;
}

/**
 * Generate all C(n, k) combinations from an array
 *
 * Classic combinations algorithm using recursion
 *
 * Time Complexity: O(C(n, k))
 * Space Complexity: O(k) for recursion depth
 */
function generateCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  if (k > arr.length) return [];

  const [first, ...rest] = arr;

  // Combinations that include first element
  const withFirst = generateCombinations(rest, k - 1).map(combo => [
    first,
    ...combo,
  ]);

  // Combinations that don't include first element
  const withoutFirst = generateCombinations(rest, k);

  return [...withFirst, ...withoutFirst];
}

/**
 * Generate combinations including optional training interviewers
 */
function generateCombinationsWithTraining(
  interviewers: Interviewer[],
  required: number
): Interviewer[][] {
  const regular = interviewers.filter(int => !int.isTraining);
  const training = interviewers.filter(int => int.isTraining);

  if (training.length === 0) return [];

  const combos: Interviewer[][] = [];

  // Generate combinations with 1+ training interviewers
  for (let numTraining = 1; numTraining <= training.length; numTraining++) {
    const numRegular = required - numTraining;
    if (numRegular < 0 || numRegular > regular.length) continue;

    const regularCombos = generateCombinations(regular, numRegular);
    const trainingCombos = generateCombinations(training, numTraining);

    for (const regCombo of regularCombos) {
      for (const trainCombo of trainingCombos) {
        combos.push([...regCombo, ...trainCombo]);
      }
    }
  }

  return combos;
}

/**
 * Backtracking algorithm to explore slot combinations
 *
 * Explores all valid interviewer combinations for each session,
 * checking conflicts at each step.
 */
async function exploreSlotCombinations(
  sessions: InterviewSession[],
  sessionCombinations: Map<string, Interviewer[][]>,
  allInterviewers: Interviewer[],
  date: string,
  calendarEvents: Map<string, CalendarEvent[]>,
  options: SchedulingOptions,
  currentSlots: InterviewSlot[],
  sessionIndex: number,
  results: SessionCombination[]
): Promise<void> {
  // Base case: all sessions scheduled
  if (sessionIndex >= sessions.length) {
    // Create session combination
    const combination: SessionCombination = {
      id: generateSlotCombinationId(currentSlots),
      date,
      slots: currentSlots,
      startTime: currentSlots[0].startTime,
      endTime: currentSlots[currentSlots.length - 1].endTime,
      totalDuration: calculateTotalDuration(currentSlots),
      loadDensity: calculateLoadDensity(currentSlots, allInterviewers),
    };

    results.push(combination);

    // Limit results
    if (options.maxResults && results.length >= options.maxResults) {
      return;
    }
    return;
  }

  const session = sessions[sessionIndex];
  const combinations = sessionCombinations.get(session.id) || [];

  // Calculate start time for this session
  const startTime = calculateSessionStartTime(currentSlots, session, date);

  // Try each interviewer combination
  for (const interviewerCombo of combinations) {
    const slot = await createAndCheckSlot(
      session,
      interviewerCombo,
      startTime,
      calendarEvents,
      options
    );

    if (slot) {
      // No conflicts - continue backtracking
      await exploreSlotCombinations(
        sessions,
        sessionCombinations,
        allInterviewers,
        date,
        calendarEvents,
        options,
        [...currentSlots, slot],
        sessionIndex + 1,
        results
      );

      // Check if we've found enough
      if (options.maxResults && results.length >= options.maxResults) {
        return;
      }
    }
  }
}

async function createAndCheckSlot(
  session: InterviewSession,
  interviewerCombo: Interviewer[],
  startTime: string,
  calendarEvents: Map<string, CalendarEvent[]>,
  options: SchedulingOptions
): Promise<InterviewSlot | null> {
  const slot: InterviewSlot = {
    id: `slot-${session.id}-${Date.now()}`,
    sessionId: session.id,
    sessionName: session.name,
    startTime,
    endTime: addMinutesToTime(startTime, session.duration),
    interviewers: interviewerCombo.map(int => ({
      interviewerId: int.id,
      name: int.name,
      email: int.email,
      isTraining: int.isTraining,
      status: 'pending',
    })),
    meetingType: session.meetingType || 'google_meet',
    location: session.location,
  };

  const conflicts = await checkSlotConflicts(
    slot,
    interviewerCombo,
    calendarEvents,
    options
  );

  return conflicts.length === 0 ? slot : null;
}

/**
 * Check for conflicts with a proposed slot
 */
async function checkSlotConflicts(
  slot: InterviewSlot,
  interviewers: Interviewer[],
  calendarEvents: Map<string, CalendarEvent[]>,
  options: SchedulingOptions
): Promise<SlotConflict[]> {
  const conflicts: SlotConflict[] = [];

  for (const interviewer of interviewers) {
    // Check availability
    const isAvailable = await isInterviewerAvailable(
      interviewer,
      slot.startTime,
      slot.endTime,
      options
    );

    if (!isAvailable.available) {
      conflicts.push(...isAvailable.conflicts);
    }

    // Check calendar conflicts
    if (options.checkCalendarConflicts) {
      const events = calendarEvents.get(interviewer.id) || [];
      for (const event of events) {
        if (
          isTimeOverlap(
            { startTime: slot.startTime, endTime: slot.endTime },
            { startTime: event.start, endTime: event.end }
          )
        ) {
          conflicts.push({
            type: 'calendar_event',
            interviewerId: interviewer.id,
            event,
            message: `Calendar conflict with "${event.title}"`,
          });
        }
      }
    }

    // Check load limits
    if (options.respectDailyLimits || options.respectWeeklyLimits) {
      const loadInfo = await calculateInterviewerLoad(
        interviewer,
        slot,
        calendarEvents.get(interviewer.id) || [],
        options
      );

      if (options.respectDailyLimits && loadInfo.daily.density > 1) {
        conflicts.push({
          type: 'daily_limit',
          interviewerId: interviewer.id,
          message: `Daily limit exceeded (${loadInfo.daily.current}/${loadInfo.daily.max})`,
        });
      }

      if (options.respectWeeklyLimits && loadInfo.weekly.density > 1) {
        conflicts.push({
          type: 'weekly_limit',
          interviewerId: interviewer.id,
          message: `Weekly limit exceeded (${loadInfo.weekly.current}/${loadInfo.weekly.max})`,
        });
      }
    }
  }

  return conflicts;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Group sessions into rounds based on break duration
 *
 * Sessions with breaks < 1 day (1440 minutes) are in the same round
 */
function groupSessionsIntoRounds(sessions: InterviewSession[]): InterviewSession[][] {
  const sorted = [...sessions].sort((a, b) => a.order - b.order);
  const rounds: InterviewSession[][] = [];
  let currentRound: InterviewSession[] = [];

  for (const session of sorted) {
    currentRound.push(session);

    // If break is >= 1 day, start new round
    if (session.breakAfter >= MINUTES_IN_DAY) {
      rounds.push(currentRound);
      currentRound = [];
    }
  }

  // Add remaining sessions
  if (currentRound.length > 0) {
    rounds.push(currentRound);
  }

  return rounds;
}

/**
 * Calculate start time for a session based on previous sessions
 */
function calculateSessionStartTime(
  previousSlots: InterviewSlot[],
  session: InterviewSession,
  date: string
): string {
  if (previousSlots.length === 0) {
    // First session - start at 9 AM by default
    return `${date}T${DEFAULT_APPOINTMENT_START_TIME}`;
  }

  const lastSlot = previousSlots[previousSlots.length - 1];

  // Add break duration to last end time
  return addMinutesToTime(lastSlot.endTime, session.breakAfter);
}

/**
 * Add minutes to an ISO 8601 time string
 *
 * @param timeStr - ISO 8601 formatted time string
 * @param minutes - Number of minutes to add
 * @returns New ISO 8601 time string with minutes added
 *
 * @example
 * ```typescript
 * addMinutesToTime('2024-01-01T09:00:00.000Z', 30)
 * // Returns: '2024-01-01T09:30:00.000Z'
 * ```
 */
function addMinutesToTime(timeStr: string, minutes: number): string {
  return addMinutes(new Date(timeStr), minutes).toISOString();
}

/**
 * Calculate total duration of slots including breaks
 *
 * Computes the time span from the start of the first slot
 * to the end of the last slot, including any breaks between them.
 *
 * @param slots - Array of interview slots in chronological order
 * @returns Total duration in minutes, or 0 if slots array is empty
 *
 * @example
 * ```typescript
 * const slots = [
 *   { startTime: '09:00', endTime: '10:00' },
 *   { startTime: '10:15', endTime: '11:00' }
 * ];
 * calculateTotalDuration(slots); // Returns: 120 minutes
 * ```
 */
function calculateTotalDuration(slots: InterviewSlot[]): number {
  if (slots.length === 0) return 0;

  const start = new Date(slots[0].startTime);
  const end = new Date(slots[slots.length - 1].endTime);

  return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
}

/**
 * Calculate load density for each interviewer in the combination
 *
 * Returns a simplified load density based on the number of slots
 * each interviewer is assigned to. For accurate load calculation
 * with respect to daily/weekly limits, use calculateInterviewerLoad
 * from loadCalculation.ts.
 *
 * @param slots - Interview slots to calculate load for
 * @param allInterviewers - All interviewers in the pool
 * @returns Map of interviewer ID to load density (0-1+ scale)
 */
function calculateLoadDensity(
  slots: InterviewSlot[],
  allInterviewers: Interviewer[]
): Record<string, number> {
  const density: Record<string, number> = {};
  const slotCounts: Record<string, number> = {};

  // Count slots per interviewer
  for (const slot of slots) {
    for (const assignment of slot.interviewers) {
      slotCounts[assignment.interviewerId] =
        (slotCounts[assignment.interviewerId] || 0) + 1;
    }
  }

  // Calculate density based on slot count
  // Assumes each interviewer can handle ~3-5 interviews per session combination
  const TYPICAL_MAX_SLOTS = 4;

  for (const [interviewerId, count] of Object.entries(slotCounts)) {
    density[interviewerId] = count / TYPICAL_MAX_SLOTS;
  }

  return density;
}

/**
 * Get average load density across all interviewers
 */
function getAverageLoadDensity(loadDensity?: Record<string, number>): number {
  if (!loadDensity || Object.keys(loadDensity).length === 0) return 0;

  const values = Object.values(loadDensity);
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Check if slot has interviewer conflicts with previous rounds
 *
 * Detects if any interviewer in the current slot combination
 * has already been assigned in a previous round. This helps
 * prevent double-booking the same interviewer across different
 * rounds of a multi-day interview process.
 *
 * @param slotCombo - Current slot combination being evaluated
 * @param previousRounds - Array of already scheduled rounds
 * @returns True if there's an interviewer conflict, false otherwise
 *
 * @example
 * ```typescript
 * const hasConflict = hasInterviewerConflictWithPreviousRounds(
 *   currentCombination,
 *   [round1, round2]
 * );
 * if (hasConflict) {
 *   // Skip this combination or find alternative
 * }
 * ```
 */
function hasInterviewerConflictWithPreviousRounds(
  slotCombo: SessionCombination,
  previousRounds: RoundPlan[]
): boolean {
  const currentInterviewers = new Set(
    slotCombo.slots.flatMap(slot =>
      slot.interviewers.map(int => int.interviewerId)
    )
  );

  for (const round of previousRounds) {
    const roundInterviewers = round.combination.slots.flatMap(slot =>
      slot.interviewers.map(int => int.interviewerId)
    );

    // Check if any interviewer appears in both
    for (const intId of roundInterviewers) {
      if (currentInterviewers.has(intId)) {
        // Would need to check actual time conflicts here
        return true;
      }
    }
  }

  return false;
}

/**
 * Extract all unique interviewer IDs from round plans
 *
 * Collects a deduplicated list of all interviewer IDs
 * participating across multiple rounds of interviews.
 *
 * @param rounds - Array of scheduled round plans
 * @returns Array of unique interviewer IDs
 *
 * @example
 * ```typescript
 * const allInterviewers = extractAllInterviewers([round1, round2, round3]);
 * console.log(`Total unique interviewers: ${allInterviewers.length}`);
 * ```
 */
function extractAllInterviewers(rounds: RoundPlan[]): string[] {
  const interviewerSet = new Set<string>();

  for (const round of rounds) {
    for (const slot of round.combination.slots) {
      for (const assignment of slot.interviewers) {
        interviewerSet.add(assignment.interviewerId);
      }
    }
  }

  return Array.from(interviewerSet);
}

/**
 * Generate unique ID for a session combination
 *
 * Creates a unique identifier for a slot combination based on
 * the session IDs and current timestamp.
 *
 * @param slots - Array of interview slots in the combination
 * @returns Unique combination ID (e.g., "combo-s1-s2-s3-1699999999")
 */
function generateSlotCombinationId(slots: InterviewSlot[]): string {
  return `combo-${slots.map(s => s.sessionId).join('-')}-${Date.now()}`;
}

/**
 * Generate unique ID for a multi-day plan
 *
 * Creates a unique identifier for a multi-day interview plan
 * based on the scheduled dates and current timestamp.
 *
 * @param rounds - Array of round plans
 * @returns Unique plan ID (e.g., "plan-2024-01-01-2024-01-05-1699999999")
 */
function generatePlanId(rounds: RoundPlan[]): string {
  return `plan-${rounds.map(r => r.date).join('-')}-${Date.now()}`;
}
