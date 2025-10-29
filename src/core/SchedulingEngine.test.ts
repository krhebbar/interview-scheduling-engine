import { describe, it, expect, vi } from 'vitest';
import { SchedulingEngine } from '../core/SchedulingEngine';
import { ValidationError } from '../errors';
import * as slotFinder from '../algorithms/slotFinder';

vi.mock('../algorithms/slotFinder');
vi.mock('date-fns-tz', () => ({
  zonedTimeToUtc: vi.fn(date => new Date(date)),
  utcToZonedTime: vi.fn(),
  format: vi.fn(),
}));

describe('SchedulingEngine', () => {
  const interviewers = [
    {
      id: '1',
      name: 'Interviewer 1',
      email: 'interviewer1@example.com',
      timezone: { tzCode: 'America/New_York', tzOffset: -240 },
      workHours: {
        monday: { startTime: '09:00', endTime: '17:00' },
      },
      limits: {
        daily: { type: 'count', max: 3 },
        weekly: { type: 'count', max: 10 },
      },
    },
  ];

  const sessions = [
    {
      id: '1',
      name: 'Technical Screen',
      duration: 60,
      breakAfter: 15,
      requiredInterviewers: 1,
      order: 1,
    },
  ];

  it('should throw a ValidationError if no sessions are provided', async () => {
    const engine = new SchedulingEngine({ timezone: 'America/New_York' });
    const options = {
      sessions: [],
      interviewers,
      dateRange: { start: '2024-01-01', end: '2024-01-01' },
      candidateTimezone: 'America/Los_Angeles',
    };
    await expect(engine.findSlots(options)).rejects.toThrow(ValidationError);
  });

  it('should call findSlotsForDay for single-day scheduling', async () => {
    const engine = new SchedulingEngine({ timezone: 'America/New_York' });
    const findSlotsForDaySpy = vi
      .spyOn(slotFinder, 'findSlotsForDay')
      .mockResolvedValue([]);
    const options = {
      sessions,
      interviewers,
      dateRange: { start: '2024-01-01', end: '2024-01-01' },
      candidateTimezone: 'America/Los_Angeles',
    };
    await engine.findSlots(options);
    expect(findSlotsForDaySpy).toHaveBeenCalled();
  });
});
