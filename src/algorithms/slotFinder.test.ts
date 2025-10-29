import { describe, it, expect, vi } from 'vitest';
import { findSlotsForDay } from '../algorithms/slotFinder';
import * as availabilityCheck from '../utils/availabilityCheck';

vi.mock('../utils/availabilityCheck', () => ({
  isInterviewerAvailable: vi.fn(),
}));
vi.mock('../utils/loadCalculation', () => ({
  calculateInterviewerLoad: vi.fn(),
}));

describe('findSlotsForDay', () => {
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

  it('should return an empty array if no slots are available', async () => {
    vi.spyOn(
      availabilityCheck,
      'isInterviewerAvailable'
    ).mockResolvedValue({
      available: false,
      conflicts: [{ type: 'work_hours', message: 'Outside work hours' }],
    });
    const slots = await findSlotsForDay(
      sessions,
      interviewers,
      '2024-01-01',
      new Map()
    );
    expect(slots).toEqual([]);
  });
});
