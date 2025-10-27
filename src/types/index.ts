/**
 * Core TypeScript types for Interview Scheduling Engine
 */

/**
 * Time zone configuration
 */
export interface TimeZone {
  /** IANA timezone code (e.g., "America/New_York") */
  tzCode: string;
  /** Offset from UTC in minutes */
  tzOffset: number;
}

/**
 * Time range within a day
 */
export interface TimeRange {
  /** Start time in HH:MM format (24-hour) */
  startTime: string;
  /** End time in HH:MM format (24-hour) */
  endTime: string;
}

/**
 * Date-time range
 */
export interface DateTimeRange {
  /** ISO 8601 date-time string */
  start: string;
  /** ISO 8601 date-time string */
  end: string;
}

/**
 * Interview session definition
 */
export interface InterviewSession {
  /** Unique session identifier */
  id: string;
  /** Session name (e.g., "Technical Screen") */
  name: string;
  /** Duration in minutes */
  duration: number;
  /** Break duration after this session in minutes */
  breakAfter: number;
  /** Number of interviewers required */
  requiredInterviewers: number;
  /** Session order in the interview flow */
  order: number;
  /** Session type */
  type?: SessionType;
  /** Meeting type */
  meetingType?: MeetingType;
  /** Physical location (for in-person meetings) */
  location?: string;
  /** Pool of interviewer IDs eligible for this session */
  interviewerPool?: string[];
  /** Whether to include training interviewers */
  allowTrainingInterviewers?: boolean;
}

/**
 * Session type
 */
export type SessionType =
  | 'technical'
  | 'system_design'
  | 'behavioral'
  | 'cultural_fit'
  | 'hiring_manager'
  | 'panel'
  | 'take_home_review'
  | 'other';

/**
 * Meeting type
 */
export type MeetingType =
  | 'google_meet'
  | 'zoom'
  | 'microsoft_teams'
  | 'phone_call'
  | 'in_person';

/**
 * Interviewer definition
 */
export interface Interviewer {
  /** Unique interviewer identifier */
  id: string;
  /** Interviewer name */
  name: string;
  /** Email address */
  email: string;
  /** Interviewer's timezone */
  timezone: TimeZone;
  /** Work hours by day of week */
  workHours: WorkHours;
  /** Interview load limits */
  limits: InterviewerLimits;
  /** Holidays */
  holidays?: Holiday[];
  /** Day-off dates (YYYY-MM-DD) */
  dayOffs?: string[];
  /** Blocked time ranges */
  blockedTimes?: DateTimeRange[];
  /** Keywords that indicate recruiting blocks in calendar */
  recruitingBlockKeywords?: string[];
  /** Whether interviewer is in training */
  isTraining?: boolean;
  /** Skill tags */
  skills?: string[];
}

/**
 * Work hours configuration
 */
export interface WorkHours {
  monday?: TimeRange;
  tuesday?: TimeRange;
  wednesday?: TimeRange;
  thursday?: TimeRange;
  friday?: TimeRange;
  saturday?: TimeRange;
  sunday?: TimeRange;
}

/**
 * Interviewer load limits
 */
export interface InterviewerLimits {
  /** Daily limit */
  daily: LoadLimit;
  /** Weekly limit */
  weekly: LoadLimit;
}

/**
 * Load limit configuration
 */
export interface LoadLimit {
  /** Limit type */
  type: 'hours' | 'count';
  /** Maximum value */
  max: number;
  /** Current value (calculated) */
  value?: number;
}

/**
 * Holiday definition
 */
export interface Holiday {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Holiday name */
  name: string;
  /** Locations where holiday applies */
  locations?: string[];
}

/**
 * Calendar event (busy time)
 */
export interface CalendarEvent {
  /** Event ID */
  id: string;
  /** Event title */
  title: string;
  /** Start date-time */
  start: string;
  /** End date-time */
  end: string;
  /** Whether this is a recruiting-related block */
  isRecruitingBlock?: boolean;
  /** Calendar provider event ID */
  providerEventId?: string;
}

/**
 * Interview slot - a specific time with assigned interviewers
 */
export interface InterviewSlot {
  /** Unique slot identifier */
  id: string;
  /** Session ID */
  sessionId: string;
  /** Session name */
  sessionName: string;
  /** Start date-time (ISO 8601) */
  startTime: string;
  /** End date-time (ISO 8601) */
  endTime: string;
  /** Assigned interviewers */
  interviewers: InterviewerAssignment[];
  /** Meeting type */
  meetingType: MeetingType;
  /** Meeting link (Google Meet, Zoom, etc.) */
  meetingLink?: string;
  /** Physical location */
  location?: string;
}

/**
 * Interviewer assignment for a slot
 */
export interface InterviewerAssignment {
  /** Interviewer ID */
  interviewerId: string;
  /** Interviewer name */
  name: string;
  /** Interviewer email */
  email: string;
  /** Whether interviewer is training */
  isTraining?: boolean;
  /** Response status */
  status?: 'pending' | 'accepted' | 'declined';
}

/**
 * Session combination - a set of slots for all sessions on one day
 */
export interface SessionCombination {
  /** Combination ID */
  id: string;
  /** Date (YYYY-MM-DD) */
  date: string;
  /** Slots for each session */
  slots: InterviewSlot[];
  /** Start time of first session */
  startTime: string;
  /** End time of last session */
  endTime: string;
  /** Total duration in minutes */
  totalDuration: number;
  /** Load density scores for involved interviewers */
  loadDensity?: Record<string, number>;
}

/**
 * Multi-day interview plan
 */
export interface MultiDayPlan {
  /** Plan ID */
  id: string;
  /** Combinations for each day/round */
  rounds: RoundPlan[];
  /** Total number of interview rounds */
  totalRounds: number;
  /** All interviewers involved across all rounds */
  allInterviewers: string[];
}

/**
 * Interview round plan (one or more sessions on same day)
 */
export interface RoundPlan {
  /** Round number (0-indexed) */
  roundNumber: number;
  /** Date (YYYY-MM-DD) */
  date: string;
  /** Session combinations for this round */
  combination: SessionCombination;
  /** Sessions in this round */
  sessions: InterviewSession[];
}

/**
 * Slot finding options
 */
export interface FindSlotsOptions {
  /** Interview sessions to schedule */
  sessions: InterviewSession[];
  /** Available interviewers */
  interviewers: Interviewer[];
  /** Date range to search */
  dateRange: {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
  };
  /** Candidate timezone */
  candidateTimezone: string;
  /** Scheduling options */
  options?: SchedulingOptions;
}

/**
 * Scheduling options/filters
 */
export interface SchedulingOptions {
  /** Respect work hours */
  respectWorkHours?: boolean;
  /** Respect holidays */
  respectHolidays?: boolean;
  /** Respect day-offs */
  respectDayOffs?: boolean;
  /** Respect daily limits */
  respectDailyLimits?: boolean;
  /** Respect weekly limits */
  respectWeeklyLimits?: boolean;
  /** Check calendar conflicts */
  checkCalendarConflicts?: boolean;
  /** Include recruiting block times as conflicts */
  excludeRecruitingBlocks?: boolean;
  /** Balance load across interviewers */
  balanceLoad?: boolean;
  /** Maximum results to return */
  maxResults?: number;
  /** Include training interviewers */
  includeTrainingInterviewers?: boolean;
}

/**
 * Conflict type
 */
export type ConflictType =
  | 'calendar_event'
  | 'work_hours'
  | 'daily_limit'
  | 'weekly_limit'
  | 'holiday'
  | 'day_off'
  | 'recruiting_block'
  | 'time_overlap'
  | 'no_interviewers_available';

/**
 * Slot conflict
 */
export interface SlotConflict {
  /** Conflict type */
  type: ConflictType;
  /** Affected interviewer ID */
  interviewerId?: string;
  /** Conflicting event */
  event?: CalendarEvent;
  /** Conflict message */
  message: string;
}

/**
 * Slot verification result
 */
export interface SlotVerificationResult {
  /** Whether slot is available */
  isAvailable: boolean;
  /** Conflicts found */
  conflicts: SlotConflict[];
  /** Updated load information */
  loadInfo?: Record<string, LoadInfo>;
}

/**
 * Load information for an interviewer
 */
export interface LoadInfo {
  /** Daily load */
  daily: {
    current: number;
    max: number;
    density: number; // 0-1 scale
  };
  /** Weekly load */
  weekly: {
    current: number;
    max: number;
    density: number;
  };
}

/**
 * Booking request
 */
export interface BookingRequest {
  /** Slot ID or full slot object */
  slot: string | SessionCombination | MultiDayPlan;
  /** Candidate information */
  candidate: {
    email: string;
    name: string;
    timezone: string;
  };
  /** Whether to create calendar events */
  createCalendarEvents?: boolean;
  /** Whether to send notifications */
  sendNotifications?: boolean;
  /** Additional notes */
  notes?: string;
}

/**
 * Booking result
 */
export interface BookingResult {
  /** Booking ID */
  id: string;
  /** Booked slots */
  slots: InterviewSlot[];
  /** Calendar event IDs */
  calendarEventIds?: string[];
  /** Booking status */
  status: 'confirmed' | 'pending' | 'failed';
  /** Creation timestamp */
  createdAt: string;
  /** Errors if any */
  errors?: string[];
}

/**
 * Self-schedule link request
 */
export interface SelfScheduleLinkRequest {
  /** Sessions to schedule */
  sessions: InterviewSession[];
  /** Available interviewers */
  interviewers: Interviewer[];
  /** Date range */
  dateRange: {
    start: string;
    end: string;
  };
  /** Candidate email */
  candidateEmail: string;
  /** Candidate name */
  candidateName?: string;
  /** Expiration time in hours */
  expiresInHours?: number;
}

/**
 * Self-schedule link
 */
export interface SelfScheduleLink {
  /** Link ID */
  id: string;
  /** Public URL */
  url: string;
  /** Expiration time */
  expiresAt: string;
  /** Candidate email */
  candidateEmail: string;
}

/**
 * Candidate availability request
 */
export interface CandidateAvailabilityRequest {
  /** Request ID */
  id: string;
  /** Sessions to schedule */
  sessions: InterviewSession[];
  /** Date range */
  dateRange: {
    start: string;
    end: string;
  };
  /** Candidate email */
  candidateEmail: string;
  /** Request status */
  status: 'pending' | 'submitted' | 'expired';
  /** Creation time */
  createdAt: string;
  /** Expiration time */
  expiresAt: string;
}

/**
 * Candidate provided availability
 */
export interface CandidateAvailability {
  /** Request ID */
  requestId: string;
  /** Available time ranges by date */
  availability: {
    date: string; // YYYY-MM-DD
    timeRanges: TimeRange[];
  }[];
  /** Submitted timestamp */
  submittedAt: string;
}

/**
 * Scheduling engine configuration
 */
export interface SchedulingEngineConfig {
  /** Default timezone */
  timezone: string;
  /** Calendar provider */
  calendarProvider?: 'google' | 'outlook' | 'custom';
  /** Calendar API credentials */
  calendarCredentials?: Record<string, any>;
  /** Default scheduling options */
  defaultOptions?: SchedulingOptions;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Time chunk for conflict detection
 */
export interface TimeChunk {
  /** Start time (ISO 8601 or minutes from day start) */
  startTime: string | number;
  /** End time (ISO 8601 or minutes from day start) */
  endTime: string | number;
}

/**
 * Overlap type
 */
export type OverlapType =
  | 'none'
  | 'exact'
  | 'left'
  | 'right'
  | 'enclosed'
  | 'encloses';
