/**
 * Interviewer Load Calculation
 *
 * Calculates and tracks interviewer load to prevent burnout and ensure
 * fair distribution of interview responsibilities.
 *
 * Supports:
 * - Daily limits (by hours or interview count)
 * - Weekly limits (by hours or interview count)
 * - Load density calculation (current / max)
 */

import type {
  Interviewer,
  InterviewSlot,
  CalendarEvent,
  LoadInfo,
  SchedulingOptions,
} from '../types';
import { getTotalDuration } from './conflictDetection';

/**
 * Calculate interviewer's current load including proposed slot
 *
 * @param interviewer - Interviewer to calculate load for
 * @param proposedSlot - New slot being considered
 * @param existingEvents - Existing calendar events (scheduled interviews)
 * @param options - Scheduling options
 * @returns Load information with density scores
 */
export async function calculateInterviewerLoad(
  interviewer: Interviewer,
  proposedSlot: InterviewSlot,
  existingEvents: CalendarEvent[],
  options: SchedulingOptions = {}
): Promise<LoadInfo> {
  const slotDate = new Date(proposedSlot.startTime);
  const slotDuration = calculateSlotDuration(proposedSlot);

  // Calculate daily load
  const dailyLoad = calculateDailyLoad(
    interviewer,
    slotDate,
    slotDuration,
    existingEvents
  );

  // Calculate weekly load
  const weeklyLoad = calculateWeeklyLoad(
    interviewer,
    slotDate,
    slotDuration,
    existingEvents
  );

  return {
    daily: dailyLoad,
    weekly: weeklyLoad,
  };
}

/**
 * Calculate daily load for an interviewer
 */
function calculateDailyLoad(
  interviewer: Interviewer,
  date: Date,
  additionalDuration: number,
  existingEvents: CalendarEvent[]
): {
  current: number;
  max: number;
  density: number;
} {
  const dateStr = date.toISOString().split('T')[0];

  // Get events for this day
  const dayEvents = existingEvents.filter(event => {
    const eventDate = new Date(event.start).toISOString().split('T')[0];
    return eventDate === dateStr;
  });

  const dailyLimit = interviewer.limits.daily;

  let current: number;
  if (dailyLimit.type === 'hours') {
    // Calculate total hours
    const totalMinutes = getTotalDuration(
      dayEvents.map(e => ({ startTime: e.start, endTime: e.end }))
    );
    current = (totalMinutes + additionalDuration) / 60; // Convert to hours
  } else {
    // Count interviews
    current = dayEvents.length + 1; // +1 for proposed slot
  }

  const density = current / dailyLimit.max;

  return {
    current,
    max: dailyLimit.max,
    density,
  };
}

/**
 * Calculate weekly load for an interviewer
 */
function calculateWeeklyLoad(
  interviewer: Interviewer,
  date: Date,
  additionalDuration: number,
  existingEvents: CalendarEvent[]
): {
  current: number;
  max: number;
  density: number;
} {
  // Get start of week (Sunday)
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  weekStart.setHours(0, 0, 0, 0);

  // Get end of week (Saturday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // Get events for this week
  const weekEvents = existingEvents.filter(event => {
    const eventDate = new Date(event.start);
    return eventDate >= weekStart && eventDate < weekEnd;
  });

  const weeklyLimit = interviewer.limits.weekly;

  let current: number;
  if (weeklyLimit.type === 'hours') {
    // Calculate total hours
    const totalMinutes = getTotalDuration(
      weekEvents.map(e => ({ startTime: e.start, endTime: e.end }))
    );
    current = (totalMinutes + additionalDuration) / 60; // Convert to hours
  } else {
    // Count interviews
    current = weekEvents.length + 1; // +1 for proposed slot
  }

  const density = current / weeklyLimit.max;

  return {
    current,
    max: weeklyLimit.max,
    density,
  };
}

/**
 * Calculate duration of a slot in minutes
 */
function calculateSlotDuration(slot: InterviewSlot): number {
  const start = new Date(slot.startTime);
  const end = new Date(slot.endTime);

  return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
}

/**
 * Get load density score for an interviewer (0-1+ scale)
 *
 * - 0.0-0.7: Low load (preferred)
 * - 0.7-0.9: Medium load (acceptable)
 * - 0.9-1.0: High load (near limit)
 * - 1.0+: Over limit (should reject)
 */
export function getLoadDensityCategory(
  density: number
): 'low' | 'medium' | 'high' | 'over_limit' {
  if (density > 1.0) return 'over_limit';
  if (density >= 0.9) return 'high';
  if (density >= 0.7) return 'medium';
  return 'low';
}

/**
 * Sort interviewers by load density (ascending)
 *
 * Useful for load balancing - prefer interviewers with lower current load
 */
export function sortByLoadDensity(
  interviewers: Interviewer[],
  loadInfoMap: Map<string, LoadInfo>
): Interviewer[] {
  return [...interviewers].sort((a, b) => {
    const loadA = loadInfoMap.get(a.id);
    const loadB = loadInfoMap.get(b.id);

    if (!loadA || !loadB) return 0;

    // Sort by weekly density first, then daily
    const weeklyDiff = loadA.weekly.density - loadB.weekly.density;
    if (Math.abs(weeklyDiff) > 0.1) return weeklyDiff;

    return loadA.daily.density - loadB.daily.density;
  });
}

/**
 * Check if adding a slot would exceed load limits
 */
export function wouldExceedLoadLimits(
  loadInfo: LoadInfo,
  options: SchedulingOptions = {}
): boolean {
  if (options.respectDailyLimits && loadInfo.daily.density > 1.0) {
    return true;
  }

  if (options.respectWeeklyLimits && loadInfo.weekly.density > 1.0) {
    return true;
  }

  return false;
}
