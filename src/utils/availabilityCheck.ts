/**
 * Interviewer Availability Checking
 *
 * Checks if interviewers are available at specific times considering:
 * - Work hours by day of week
 * - Holidays
 * - Day-offs
 * - Blocked times
 */

import type {
  Interviewer,
  SchedulingOptions,
  SlotConflict,
  TimeRange,
} from '../types';
import { isTimeInRange } from './conflictDetection';

export interface AvailabilityResult {
  available: boolean;
  conflicts: SlotConflict[];
}

/**
 * Check if interviewer is available at a specific time
 *
 * @param interviewer - Interviewer to check
 * @param startTime - Start time (ISO 8601)
 * @param endTime - End time (ISO 8601)
 * @param options - Scheduling options determining which checks to perform
 * @returns Availability result with conflicts
 */
export async function isInterviewerAvailable(
  interviewer: Interviewer,
  startTime: string,
  endTime: string,
  options: SchedulingOptions = {}
): Promise<AvailabilityResult> {
  const conflicts: SlotConflict[] = [];

  const start = new Date(startTime);
  const end = new Date(endTime);
  const date = start.toISOString().split('T')[0];

  // Check work hours
  if (options.respectWorkHours !== false) {
    const workHoursConflict = checkWorkHours(interviewer, start, end);
    if (workHoursConflict) {
      conflicts.push(workHoursConflict);
    }
  }

  // Check holidays
  if (options.respectHolidays !== false) {
    const holidayConflict = checkHolidays(interviewer, date);
    if (holidayConflict) {
      conflicts.push(holidayConflict);
    }
  }

  // Check day-offs
  if (options.respectDayOffs !== false) {
    const dayOffConflict = checkDayOffs(interviewer, date);
    if (dayOffConflict) {
      conflicts.push(dayOffConflict);
    }
  }

  // Check blocked times
  const blockedTimeConflict = checkBlockedTimes(interviewer, startTime, endTime);
  if (blockedTimeConflict) {
    conflicts.push(blockedTimeConflict);
  }

  return {
    available: conflicts.length === 0,
    conflicts,
  };
}

/**
 * Check if time falls within interviewer's work hours
 */
function checkWorkHours(
  interviewer: Interviewer,
  start: Date,
  end: Date
): SlotConflict | null {
  const dayOfWeek = getDayOfWeek(start);
  const workHours = interviewer.workHours[dayOfWeek];

  if (!workHours) {
    return {
      type: 'work_hours',
      interviewerId: interviewer.id,
      message: `${interviewer.name} does not work on ${dayOfWeek}`,
    };
  }

  // Convert to minutes from midnight
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();

  const [workStartHours, workStartMins] = workHours.startTime.split(':').map(Number);
  const [workEndHours, workEndMins] = workHours.endTime.split(':').map(Number);

  const workStartMinutes = workStartHours * 60 + workStartMins;
  const workEndMinutes = workEndHours * 60 + workEndMins;

  if (startMinutes < workStartMinutes || endMinutes > workEndMinutes) {
    return {
      type: 'work_hours',
      interviewerId: interviewer.id,
      message: `Outside work hours (${workHours.startTime} - ${workHours.endTime})`,
    };
  }

  return null;
}

/**
 * Check if date is a holiday for the interviewer
 */
function checkHolidays(
  interviewer: Interviewer,
  date: string
): SlotConflict | null {
  if (!interviewer.holidays) return null;

  const holiday = interviewer.holidays.find(h => h.date === date);

  if (holiday) {
    return {
      type: 'holiday',
      interviewerId: interviewer.id,
      message: `Holiday: ${holiday.name}`,
    };
  }

  return null;
}

/**
 * Check if date is a day-off for the interviewer
 */
function checkDayOffs(
  interviewer: Interviewer,
  date: string
): SlotConflict | null {
  if (!interviewer.dayOffs) return null;

  if (interviewer.dayOffs.includes(date)) {
    return {
      type: 'day_off',
      interviewerId: interviewer.id,
      message: `Day off for ${interviewer.name}`,
    };
  }

  return null;
}

/**
 * Check if time overlaps with blocked times
 */
function checkBlockedTimes(
  interviewer: Interviewer,
  startTime: string,
  endTime: string
): SlotConflict | null {
  if (!interviewer.blockedTimes) return null;

  for (const blocked of interviewer.blockedTimes) {
    // Check overlap
    const blockedStart = new Date(blocked.start);
    const blockedEnd = new Date(blocked.end);
    const slotStart = new Date(startTime);
    const slotEnd = new Date(endTime);

    if (
      !(slotEnd <= blockedStart || slotStart >= blockedEnd)
    ) {
      return {
        type: 'recruiting_block',
        interviewerId: interviewer.id,
        message: `Overlaps with blocked time (${blocked.start} - ${blocked.end})`,
      };
    }
  }

  return null;
}

/**
 * Get day of week from Date object
 */
function getDayOfWeek(date: Date): keyof typeof import('../types').WorkHours {
  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ] as const;

  return days[date.getDay()];
}
