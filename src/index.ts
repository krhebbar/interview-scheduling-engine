/**
 * Interview Scheduling Engine
 *
 * Production-grade TypeScript library for intelligent interview scheduling.
 *
 * @example
 * ```typescript
 * import { SchedulingEngine } from 'interview-scheduling-engine';
 *
 * const engine = new SchedulingEngine({
 *   timezone: 'America/New_York',
 *   calendarProvider: 'google',
 * });
 *
 * const slots = await engine.findSlots({
 *   sessions: [...],
 *   interviewers: [...],
 *   dateRange: { start: '2024-02-01', end: '2024-02-15' },
 *   candidateTimezone: 'America/Los_Angeles',
 * });
 * ```
 */

// Main Engine
export { SchedulingEngine, createSchedulingEngine } from './core/SchedulingEngine';

// Algorithms
export {
  findSlotsForDay,
  findMultiDaySlots,
  generateInterviewerCombinations,
} from './algorithms/slotFinder';

// Utilities
export {
  isTimeOverlap,
  getOverlapType,
  isLeftOverlap,
  isRightOverlap,
  isEnclosed,
  isEncloses,
  isExactMatch,
  getOverlapDuration,
  getTimeDifference,
  findAllOverlaps,
  mergeTimeChunks,
  getTotalDuration,
  subtractTimeChunks,
  compareTimesByMinute,
  isTimeInRange,
} from './utils/conflictDetection';

export {
  isInterviewerAvailable,
} from './utils/availabilityCheck';

export {
  calculateInterviewerLoad,
  getLoadDensityCategory,
  sortByLoadDensity,
  wouldExceedLoadLimits,
} from './utils/loadCalculation';

// Types
export type {
  // Core types
  TimeZone,
  TimeRange,
  DateTimeRange,
  TimeChunk,
  OverlapType,

  // Session types
  InterviewSession,
  SessionType,
  MeetingType,

  // Interviewer types
  Interviewer,
  WorkHours,
  InterviewerLimits,
  LoadLimit,
  Holiday,

  // Calendar types
  CalendarEvent,

  // Slot types
  InterviewSlot,
  InterviewerAssignment,
  SessionCombination,
  MultiDayPlan,
  RoundPlan,

  // Scheduling types
  FindSlotsOptions,
  SchedulingOptions,

  // Conflict types
  ConflictType,
  SlotConflict,
  SlotVerificationResult,
  LoadInfo,

  // Booking types
  BookingRequest,
  BookingResult,

  // Self-scheduling types
  SelfScheduleLinkRequest,
  SelfScheduleLink,
  CandidateAvailabilityRequest,
  CandidateAvailability,

  // Engine config
  SchedulingEngineConfig,
} from './types';
