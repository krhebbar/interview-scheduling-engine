/**
 * Example: Basic Interview Scheduling
 *
 * Demonstrates:
 * - Creating a scheduling engine
 * - Defining sessions and interviewers
 * - Finding available slots
 * - Booking a slot
 */

import { SchedulingEngine } from '../src';
import type { InterviewSession, Interviewer } from '../src';

async function main() {
  console.log('🗓️  Basic Interview Scheduling Example\n');

  // 1. Create scheduling engine
  const engine = new SchedulingEngine({
    timezone: 'America/New_York',
    calendarProvider: 'google',
  });

  // 2. Define interview sessions
  const sessions: InterviewSession[] = [
    {
      id: 'session-1',
      name: 'Technical Screen',
      duration: 60, // 60 minutes
      breakAfter: 15, // 15 minute break
      requiredInterviewers: 1,
      order: 1,
      type: 'technical',
      meetingType: 'google_meet',
    },
    {
      id: 'session-2',
      name: 'System Design',
      duration: 90, // 90 minutes
      breakAfter: 15,
      requiredInterviewers: 2, // 2 interviewers required
      order: 2,
      type: 'system_design',
      meetingType: 'google_meet',
    },
    {
      id: 'session-3',
      name: 'Behavioral Interview',
      duration: 45,
      breakAfter: 0, // No break after (end of interview loop)
      requiredInterviewers: 1,
      order: 3,
      type: 'behavioral',
      meetingType: 'google_meet',
    },
  ];

  // 3. Define available interviewers
  const interviewers: Interviewer[] = [
    {
      id: 'int-1',
      name: 'Alice Engineer',
      email: 'alice@company.com',
      timezone: {
        tzCode: 'America/New_York',
        tzOffset: -300,
      },
      workHours: {
        monday: { startTime: '09:00', endTime: '17:00' },
        tuesday: { startTime: '09:00', endTime: '17:00' },
        wednesday: { startTime: '09:00', endTime: '17:00' },
        thursday: { startTime: '09:00', endTime: '17:00' },
        friday: { startTime: '09:00', endTime: '17:00' },
      },
      limits: {
        daily: { type: 'hours', max: 4 },
        weekly: { type: 'hours', max: 15 },
      },
      skills: ['javascript', 'typescript', 'react'],
    },
    {
      id: 'int-2',
      name: 'Bob Senior',
      email: 'bob@company.com',
      timezone: {
        tzCode: 'America/New_York',
        tzOffset: -300,
      },
      workHours: {
        monday: { startTime: '10:00', endTime: '18:00' },
        tuesday: { startTime: '10:00', endTime: '18:00' },
        wednesday: { startTime: '10:00', endTime: '18:00' },
        thursday: { startTime: '10:00', endTime: '18:00' },
        friday: { startTime: '10:00', endTime: '18:00' },
      },
      limits: {
        daily: { type: 'hours', max: 3 },
        weekly: { type: 'hours', max: 12 },
      },
      skills: ['system-design', 'architecture'],
    },
    {
      id: 'int-3',
      name: 'Charlie Manager',
      email: 'charlie@company.com',
      timezone: {
        tzCode: 'America/New_York',
        tzOffset: -300,
      },
      workHours: {
        monday: { startTime: '09:00', endTime: '17:00' },
        tuesday: { startTime: '09:00', endTime: '17:00' },
        wednesday: { startTime: '09:00', endTime: '17:00' },
        thursday: { startTime: '09:00', endTime: '17:00' },
        friday: { startTime: '09:00', endTime: '17:00' },
      },
      limits: {
        daily: { type: 'count', max: 3 }, // Max 3 interviews per day
        weekly: { type: 'count', max: 10 },
      },
      skills: ['hiring', 'leadership'],
    },
    {
      id: 'int-4',
      name: 'Diana Architect',
      email: 'diana@company.com',
      timezone: {
        tzCode: 'America/New_York',
        tzOffset: -300,
      },
      workHours: {
        monday: { startTime: '09:00', endTime: '17:00' },
        tuesday: { startTime: '09:00', endTime: '17:00' },
        wednesday: { startTime: '09:00', endTime: '17:00' },
        thursday: { startTime: '09:00', endTime: '17:00' },
        friday: { startTime: '13:00', endTime: '17:00' }, // Part-time Friday
      },
      limits: {
        daily: { type: 'hours', max: 4 },
        weekly: { type: 'hours', max: 15 },
      },
      skills: ['system-design', 'architecture', 'leadership'],
    },
  ];

  console.log(`📋 Scheduling Configuration:`);
  console.log(`   Sessions: ${sessions.length}`);
  console.log(`   Total duration: ${sessions.reduce((sum, s) => sum + s.duration, 0)} minutes`);
  console.log(`   Interviewers: ${interviewers.length}`);
  console.log();

  // 4. Find available slots
  console.log('🔍 Finding available slots...\n');

  try {
    const slots = await engine.findSlots({
      sessions,
      interviewers,
      dateRange: {
        start: '2024-02-05', // Monday
        end: '2024-02-09',   // Friday
      },
      candidateTimezone: 'America/Los_Angeles',
      options: {
        maxResults: 10,
        respectWorkHours: true,
        respectDailyLimits: true,
        balanceLoad: true,
      },
    });

    console.log(`✅ Found ${slots.length} available slot combinations\n`);

    // Display first 3 slots
    const displayCount = Math.min(3, slots.length);
    for (let i = 0; i < displayCount; i++) {
      const slot = slots[i];
      if ('slots' in slot) {
        // SessionCombination
        console.log(`Option ${i + 1}: ${slot.date}`);
        console.log(`   Time: ${slot.startTime} - ${slot.endTime}`);
        console.log(`   Total duration: ${slot.totalDuration} minutes`);
        console.log(`   Sessions:`);

        for (const s of slot.slots) {
          const interviewerNames = s.interviewers.map(int => int.name).join(', ');
          console.log(`     • ${s.sessionName} (${s.startTime.split('T')[1].substring(0, 5)}) - ${interviewerNames}`);
        }

        console.log();
      }
    }

    if (slots.length > 0) {
      // 5. Verify slot before booking
      console.log('🔍 Verifying slot availability...\n');

      const selectedSlot = slots[0];
      const verification = await engine.verifySlot(selectedSlot as any, interviewers);

      if (verification.isAvailable) {
        console.log('✅ Slot is available!\n');

        // Display load information
        if (verification.loadInfo) {
          console.log('📊 Interviewer Load:');
          for (const [intId, load] of Object.entries(verification.loadInfo)) {
            const interviewer = interviewers.find(i => i.id === intId);
            console.log(`   ${interviewer?.name}:`);
            console.log(`     Daily: ${load.daily.current.toFixed(1)}/${load.daily.max} (${(load.daily.density * 100).toFixed(0)}%)`);
            console.log(`     Weekly: ${load.weekly.current.toFixed(1)}/${load.weekly.max} (${(load.weekly.density * 100).toFixed(0)}%)`);
          }
          console.log();
        }

        // 6. Book the slot
        console.log('📅 Booking interview...\n');

        const booking = await engine.bookSlot({
          slot: selectedSlot as any,
          candidate: {
            email: 'candidate@example.com',
            name: 'John Doe',
            timezone: 'America/Los_Angeles',
          },
          createCalendarEvents: true,
          sendNotifications: true,
          notes: 'Senior Software Engineer position',
        });

        if (booking.status === 'confirmed') {
          console.log('✅ Interview booked successfully!\n');
          console.log(`   Booking ID: ${booking.id}`);
          console.log(`   Status: ${booking.status}`);
          console.log(`   Slots booked: ${booking.slots.length}`);
          console.log(`   Calendar events created: ${booking.calendarEventIds?.length || 0}`);
          console.log();

          // Display booked slots
          console.log('📅 Scheduled Interviews:');
          for (const slot of booking.slots) {
            const start = new Date(slot.startTime);
            const formattedTime = start.toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZone: 'America/New_York',
            });

            console.log(`   ${formattedTime} - ${slot.sessionName}`);
            console.log(`      Interviewers: ${slot.interviewers.map(i => i.name).join(', ')}`);
            console.log(`      Meeting: ${slot.meetingType}`);
          }
        } else {
          console.log('❌ Booking failed\n');
          if (booking.errors) {
            booking.errors.forEach(err => console.log(`   Error: ${err}`));
          }
        }
      } else {
        console.log('❌ Slot is no longer available\n');
        console.log('Conflicts:');
        verification.conflicts.forEach(conflict => {
          console.log(`   • ${conflict.type}: ${conflict.message}`);
        });
      }
    } else {
      console.log('❌ No available slots found for the date range');
      console.log('\nTips:');
      console.log('   • Try expanding the date range');
      console.log('   • Check interviewer work hours and limits');
      console.log('   • Reduce required interviewers per session');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n✨ Example completed!');
}

// Run the example
main().catch(console.error);
