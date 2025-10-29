/**
 * Interviewer Availability Checking
 *
 * Checks if interviewers are available at specific times considering:
 * - Work hours by day of week
 * - Holidays
 * - Day-offs
 * - Blocked times
 */

import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';
import {
  parse,
  getHours,
  getMinutes,
  isSameDay,
  isWithinInterval,
} from 'date-fns';
import type {
  Interviewer,
  SchedulingOptions,
  SlotConflict,
  TimeRange,
} from '../types';
import { isTimeInRange } from './conflictDetection';
import { DAYS_OF_WEEK } from '../constants';

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

  const start = zonedTimeToUtc(startTime, interviewer.timezone.tzCode);
  const end = zonedTimeToUtc(endTime, interviewer.timezone.tzCode);
  const date = format(start, 'yyyy-MM-dd', {
    timeZone: interviewer.timezone.tzCode,
  });

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
  const zonedStart = utcToZonedTime(start, interviewer.timezone.tzCode);
  const dayOfWeek = getDayOfWeek(zonedStart);
  const workHours = interviewer.workHours[dayOfWeek];

  if (!workHours) {
    return {
      type: 'work_hours',
      interviewerId: interviewer.id,
      message: `${interviewer.name} does not work on ${dayOfWeek}`,
    };
  }

  const workStartTime = parse(workHours.startTime, 'HH:mm', new Date());
  const workEndTime = parse(workHours.endTime, 'HH:mm', new Date());

  const startMinutes = getHours(zonedStart) * 60 + getMinutes(zonedStart);
  const endMinutes = getHours(end) * 60 + getMinutes(end);

  const workStartMinutes =
    getHours(workStartTime) * 60 + getMinutes(workStartTime);
  const workEndMinutes = getHours(workEndTime) * 60 + getMinutes(workEndTime);

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

  const holiday = interviewer.holidays.find(h =>
    isSameDay(parse(h.date, 'yyyy-MM-dd', new Date()), date)
  );

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

  if (
    interviewer.dayOffs.some(d =>
      isSameDay(parse(d, 'yyyy-MM-dd', new Date()), date)
    )
  ) {
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

  const slotInterval = {
    start: zonedTimeToUtc(startTime, interviewer.timezone.tzCode),
    end: zonedTimeToUtc(endTime, interviewer.timezone.tzCode),
  };

  for (const blocked of interviewer.blockedTimes) {
    const blockedInterval = {
      start: zonedTimeToUtc(blocked.start, interviewer.timezone.tzCode),
      end: zonedTimeToUtc(blocked.end, interviewer.timezone.tzCode),
    };

    if (isWithinInterval(slotInterval.start, blockedInterval)) {
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
  return DAYS_OF_WEEK[date.getDay()];
}
