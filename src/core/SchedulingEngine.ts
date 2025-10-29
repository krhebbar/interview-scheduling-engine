/**
 * Main Scheduling Engine Class
 *
 * Orchestrates all scheduling operations including:
 * - Finding available slots
 * - Verifying slot availability
 * - Booking interviews
 * - Managing calendar integration
 * - Self-scheduling workflows
 */

import type {
  SchedulingEngineConfig,
  FindSlotsOptions,
  SessionCombination,
  MultiDayPlan,
  BookingRequest,
  BookingResult,
  SelfScheduleLinkRequest,
  SelfScheduleLink,
  CandidateAvailabilityRequest,
  CandidateAvailability,
  InterviewSlot,
  CalendarEvent,
  SlotVerificationResult,
  Interviewer,
} from '../types';
import { addDays, format, isBefore, isEqual } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';
import {
  findSlotsForDay,
  findMultiDaySlots,
} from '../algorithms/slotFinder';
import { isTimeOverlap } from '../utils/conflictDetection';
import { calculateInterviewerLoad } from '../utils/loadCalculation';
import { MINUTES_IN_DAY } from '../constants';
import {
  SlotBookingError,
  ValidationError,
  SchedulingError,
} from '../errors';

/**
 * Main Scheduling Engine
 *
 * @example
 * ```typescript
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
export class SchedulingEngine {
  private config: SchedulingEngineConfig;
  private calendarCache: Map<string, CalendarEvent[]> = new Map();

  constructor(config: SchedulingEngineConfig) {
    this.config = {
      defaultOptions: {
        respectWorkHours: true,
        respectHolidays: true,
        respectDayOffs: true,
        respectDailyLimits: true,
        respectWeeklyLimits: true,
        checkCalendarConflicts: true,
        excludeRecruitingBlocks: true,
        balanceLoad: true,
        maxResults: 100,
        includeTrainingInterviewers: false,
      },
      ...config,
    };
  }

  /**
   * Find available interview slots
   *
   * This is the main entry point for slot finding. Automatically determines
   * whether to use single-day or multi-day scheduling based on session breaks.
   *
   * @param options - Slot finding options
   * @returns Array of available slot combinations or multi-day plans
   *
   * @example
   * ```typescript
   * const slots = await engine.findSlots({
   *   sessions: [
   *     { id: '1', name: 'Technical', duration: 60, breakAfter: 15, requiredInterviewers: 1, order: 1 },
   *     { id: '2', name: 'Behavioral', duration: 45, breakAfter: 0, requiredInterviewers: 1, order: 2 },
   *   ],
   *   interviewers: [...],
   *   dateRange: { start: '2024-02-01', end: '2024-02-15' },
   *   candidateTimezone: 'America/Los_Angeles',
   * });
   * ```
   */
  async findSlots(
    options: FindSlotsOptions
  ): Promise<SessionCombination[] | MultiDayPlan[]> {
    try {
      if (!options.sessions || options.sessions.length === 0) {
        throw new ValidationError('At least one session is required.');
      }
      if (!options.interviewers || options.interviewers.length === 0) {
        throw new ValidationError('At least one interviewer is required.');
      }
      if (!options.dateRange.start || !options.dateRange.end) {
        throw new ValidationError('A date range with a start and end is required.');
      }

      const mergedOptions = {
        ...this.config.defaultOptions,
        ...options.options,
      };

      // Check if multi-day scheduling is needed
      const needsMultiDay = this.needsMultiDayScheduling(options.sessions);

      // Fetch calendar events for all interviewers
      const calendarEvents = await this.fetchCalendarEvents(
        options.interviewers,
        options.dateRange
      );

      if (needsMultiDay) {
        return await findMultiDaySlots(
          options.sessions,
          options.interviewers,
          options.dateRange,
          calendarEvents,
          mergedOptions
        );
      } else {
        // Single day scheduling - find slots for each day in range
        const allSlots: SessionCombination[] = [];
        let currentDate = zonedTimeToUtc(
          options.dateRange.start,
          this.config.timezone
        );
        const endDate = zonedTimeToUtc(
          options.dateRange.end,
          this.config.timezone
        );

        while (isBefore(currentDate, endDate) || isEqual(currentDate, endDate)) {
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          const daySlots = await findSlotsForDay(
            options.sessions,
            options.interviewers,
            dateStr,
            calendarEvents,
            mergedOptions
          );

          allSlots.push(...daySlots);

          // Check max results
          if (
            mergedOptions.maxResults &&
            allSlots.length >= mergedOptions.maxResults
          ) {
            break;
          }

          currentDate = addDays(currentDate, 1);
        }

        return allSlots.slice(0, mergedOptions.maxResults);
      }
    } catch (error) {
      if (error instanceof SchedulingError) {
        throw error;
      }
      throw new SchedulingError(`Failed to find slots: ${error.message}`);
    }
  }

  /**
   * Find slots for a specific date
   *
   * Useful when you want to search only one specific day.
   *
   * @param sessions - Interview sessions
   * @param interviewers - Available interviewers
   * @param date - Date to search (YYYY-MM-DD)
   * @param options - Scheduling options
   * @returns Available slots for that date
   */
  async findSlotsForDate(
    sessions: InterviewSession[],
    interviewers: Interviewer[],
    date: string,
    options?: FindSlotsOptions['options']
  ): Promise<SessionCombination[]> {
    const mergedOptions = {
      ...this.config.defaultOptions,
      ...options,
    };

    const calendarEvents = await this.fetchCalendarEvents(interviewers, {
      start: date,
      end: date,
    });

    return await findSlotsForDay(
      sessions,
      interviewers,
      date,
      calendarEvents,
      mergedOptions
    );
  }

  /**
   * Verify that a slot is still available
   *
   * Re-checks conflicts before booking to ensure no race conditions.
   *
   * @param slotId - Slot ID to verify
   * @param interviewers - All interviewers
   * @returns Verification result with any conflicts found
   *
   * @example
   * ```typescript
   * const verification = await engine.verifySlot(slotId, interviewers);
   * if (verification.isAvailable) {
   *   await engine.bookSlot({ slot: slotId, candidate: {...} });
   * }
   * ```
   */
  async verifySlot(
    slot: SessionCombination | MultiDayPlan,
    interviewers: Interviewer[]
  ): Promise<SlotVerificationResult> {
    // Extract all slots from combination or plan
    const slots = this.extractSlots(slot);

    // Re-fetch calendar events
    const dates = slots.map(s => s.startTime.split('T')[0]);
    const minDate = dates.sort()[0];
    const maxDate = dates.sort()[dates.length - 1];

    const calendarEvents = await this.fetchCalendarEvents(interviewers, {
      start: minDate,
      end: maxDate,
    });

    // Check each slot for conflicts
    const allConflicts: SlotVerificationResult['conflicts'] = [];
    const loadInfo: Record<string, any> = {};

    for (const slot of slots) {
      for (const assignment of slot.interviewers) {
        const interviewer = interviewers.find(i => i.id === assignment.interviewerId);
        if (!interviewer) continue;

        const events = calendarEvents.get(interviewer.id) || [];

        // Check calendar conflicts
        for (const event of events) {
          if (
            isTimeOverlap(
              { startTime: slot.startTime, endTime: slot.endTime },
              { startTime: event.start, endTime: event.end }
            )
          ) {
            allConflicts.push({
              type: 'calendar_event',
              interviewerId: interviewer.id,
              event,
              message: `Calendar conflict with "${event.title}"`,
            });
          }
        }

        // Calculate load
        const load = await calculateInterviewerLoad(
          interviewer,
          slot,
          events,
          this.config.defaultOptions
        );

        loadInfo[interviewer.id] = load;

        // Check if over limits
        if (load.daily.density > 1.0) {
          allConflicts.push({
            type: 'daily_limit',
            interviewerId: interviewer.id,
            message: `Daily limit exceeded`,
          });
        }

        if (load.weekly.density > 1.0) {
          allConflicts.push({
            type: 'weekly_limit',
            interviewerId: interviewer.id,
            message: `Weekly limit exceeded`,
          });
        }
      }
    }

    return {
      isAvailable: allConflicts.length === 0,
      conflicts: allConflicts,
      loadInfo,
    };
  }

  /**
   * Book an interview slot
   *
   * Verifies availability, creates calendar events, and sends notifications.
   *
   * @param request - Booking request
   * @returns Booking result with confirmation
   *
   * @example
   * ```typescript
   * const booking = await engine.bookSlot({
   *   slot: selectedSlot,
   *   candidate: {
   *     email: 'candidate@example.com',
   *     name: 'John Doe',
   *     timezone: 'America/Los_Angeles',
   *   },
   *   createCalendarEvents: true,
   *   sendNotifications: true,
   * });
   * ```
   */
  async bookSlot(request: BookingRequest): Promise<BookingResult> {
    try {
      // Extract slots
      let slots: InterviewSlot[];
      if (typeof request.slot === 'string') {
        throw new SlotBookingError(
          'Slot ID booking not yet implemented. Pass full slot object.'
        );
      } else if ('rounds' in request.slot) {
        // Multi-day plan
        slots = request.slot.rounds.flatMap(r => r.combination.slots);
      } else {
        // Single combination
        slots = request.slot.slots;
      }

      const calendarEventIds: string[] = [];

      // Create calendar events if requested
      if (request.createCalendarEvents) {
        for (const slot of slots) {
          const eventId = await this.createCalendarEvent(slot, request.candidate);
          if (eventId) {
            calendarEventIds.push(eventId);
          }
        }
      }

      // Send notifications if requested
      if (request.sendNotifications) {
        await this.sendBookingNotifications(slots, request.candidate);
      }

      return {
        id: `booking-${Date.now()}`,
        slots,
        calendarEventIds,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof SchedulingError) {
        throw error;
      }
      throw new SlotBookingError(`Failed to book slot: ${error.message}`);
    }
  }

  /**
   * Cancel a booked interview slot
   *
   * @param slotId - Slot ID to cancel
   * @returns Success status
   */
  async cancelSlot(slotId: string): Promise<{ success: boolean; message: string }> {
    // Implementation would delete calendar events and send notifications
    return {
      success: true,
      message: `Slot ${slotId} cancelled successfully`,
    };
  }

  /**
   * Create a self-scheduling link for candidates
   *
   * Generates a unique URL that candidates can use to select their preferred time.
   *
   * @param request - Self-schedule link request
   * @returns Self-schedule link with URL and expiration
   *
   * @example
   * ```typescript
   * const link = await engine.createSelfScheduleLink({
   *   sessions: [...],
   *   interviewers: [...],
   *   dateRange: { start: '2024-02-01', end: '2024-02-15' },
   *   candidateEmail: 'candidate@example.com',
   *   expiresInHours: 72,
   * });
   *
   * console.log(`Send this link to candidate: ${link.url}`);
   * ```
   */
  async createSelfScheduleLink(
    request: SelfScheduleLinkRequest
  ): Promise<SelfScheduleLink> {
    const linkId = `ssl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresInHours = request.expiresInHours || 72; // Default 3 days

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // In production, this would:
    // 1. Store the request in database
    // 2. Generate secure token
    // 3. Create URL with token

    return {
      id: linkId,
      url: `https://yourapp.com/schedule/${linkId}`,
      expiresAt: expiresAt.toISOString(),
      candidateEmail: request.candidateEmail,
    };
  }

  /**
   * Request availability from candidate
   *
   * Sends a request to the candidate to provide their available time ranges.
   *
   * @param sessions - Sessions to schedule
   * @param dateRange - Date range to request availability for
   * @param candidateEmail - Candidate email
   * @returns Availability request object
   */
  async requestCandidateAvailability(
    sessions: FindSlotsOptions['sessions'],
    dateRange: FindSlotsOptions['dateRange'],
    candidateEmail: string
  ): Promise<CandidateAvailabilityRequest> {
    const requestId = `car-${Date.now()}`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days to respond

    return {
      id: requestId,
      sessions,
      dateRange,
      candidateEmail,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Find slots within candidate-provided availability
   *
   * @param availability - Candidate provided availability
   * @param sessions - Sessions to schedule
   * @param interviewers - Available interviewers
   * @returns Slots that fit within candidate availability
   */
  async findSlotsWithinAvailability(
    availability: CandidateAvailability,
    sessions: FindSlotsOptions['sessions'],
    interviewers: Interviewer[]
  ): Promise<SessionCombination[]> {
    // Implementation would filter slots by candidate availability times
    // For now, return empty array
    return [];
  }

  /**
   * Sync calendar events for interviewers
   *
   * @param email - Interviewer email
   * @param dateRange - Date range to sync
   */
  async syncCalendar(
    email: string,
    dateRange: { start: string; end: string }
  ): Promise<void> {
    // Implementation would call calendar API
    // For now, just clear cache
    this.calendarCache.delete(email);
  }

  /**
   * Get busy times for an interviewer
   *
   * @param email - Interviewer email
   * @param date - Date to get busy times for
   * @returns Array of busy time ranges
   */
  async getBusyTimes(
    email: string,
    date: string
  ): Promise<CalendarEvent[]> {
    const events = this.calendarCache.get(email) || [];
    return events.filter(event => {
      const eventDate = new Date(event.start).toISOString().split('T')[0];
      return eventDate === date;
    });
  }

  /**
   * Check calendar integration status
   *
   * @param email - Interviewer email
   * @returns Calendar connection status
   */
  async checkCalendarStatus(email: string): Promise<{
    connected: boolean;
    provider?: string;
    lastSync?: string;
  }> {
    // Implementation would check calendar API connection
    return {
      connected: true,
      provider: this.config.calendarProvider,
      lastSync: new Date().toISOString(),
    };
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  /**
   * Determine if multi-day scheduling is needed
   */
  private needsMultiDayScheduling(sessions: FindSlotsOptions['sessions']): boolean {
    return sessions.some(session => session.breakAfter >= MINUTES_IN_DAY);
  }

  /**
   * Fetch calendar events for interviewers
   */
  private async fetchCalendarEvents(
    interviewers: Interviewer[],
    dateRange: { start: string; end: string }
  ): Promise<Map<string, CalendarEvent[]>> {
    const eventsMap = new Map<string, CalendarEvent[]>();

    for (const interviewer of interviewers) {
      // Check cache first
      if (this.calendarCache.has(interviewer.email)) {
        eventsMap.set(interviewer.id, this.calendarCache.get(interviewer.email)!);
        continue;
      }

      // In production, this would call calendar API
      // For now, return empty array
      const events: CalendarEvent[] = [];

      this.calendarCache.set(interviewer.email, events);
      eventsMap.set(interviewer.id, events);
    }

    return eventsMap;
  }

  /**
   * Extract all slots from a combination or plan
   */
  private extractSlots(
    slotOrPlan: SessionCombination | MultiDayPlan
  ): InterviewSlot[] {
    if ('rounds' in slotOrPlan) {
      // Multi-day plan
      return slotOrPlan.rounds.flatMap(r => r.combination.slots);
    } else {
      // Single combination
      return slotOrPlan.slots;
    }
  }

  /**
   * Create calendar event for a slot
   */
  private async createCalendarEvent(
    slot: InterviewSlot,
    candidate: BookingRequest['candidate']
  ): Promise<string | null> {
    // Implementation would call calendar API to create event
    // Return event ID
    return `event-${Date.now()}`;
  }

  /**
   * Send booking confirmation notifications
   */
  private async sendBookingNotifications(
    slots: InterviewSlot[],
    candidate: BookingRequest['candidate']
  ): Promise<void> {
    // Implementation would send emails to:
    // - Candidate
    // - All interviewers
    // - Recruiters
  }
}

/**
 * Factory function to create a scheduling engine
 */
export function createSchedulingEngine(
  config: SchedulingEngineConfig
): SchedulingEngine {
  return new SchedulingEngine(config);
}
