/**
 * Example: Multi-Day Interview Scheduling
 *
 * Demonstrates:
 * - Scheduling interviews that span multiple days
 * - Handling interview rounds with gaps between them
 * - Finding optimal multi-day schedules
 */

import { SchedulingEngine } from '../src';
import type { InterviewSession, Interviewer } from '../src';

async function main() {
  console.log('🗓️  Multi-Day Interview Scheduling Example\n');

  const engine = new SchedulingEngine({
    timezone: 'America/New_York',
  });

  // Define a multi-round interview process
  // Round 1: Initial screening (same day)
  // Round 2: Technical rounds (1 day later)
  // Round 3: Final interview (1 week later)
  const sessions: InterviewSession[] = [
    // Round 1 - Day 1
    {
      id: 'session-1',
      name: 'Phone Screen',
      duration: 30,
      breakAfter: 15,
      requiredInterviewers: 1,
      order: 1,
      type: 'technical',
      meetingType: 'phone_call',
    },
    {
      id: 'session-2',
      name: 'Coding Challenge Review',
      duration: 45,
      breakAfter: 1440, // 1 day break (1440 minutes = 24 hours)
      requiredInterviewers: 1,
      order: 2,
      type: 'technical',
      meetingType: 'google_meet',
    },

    // Round 2 - Day 2
    {
      id: 'session-3',
      name: 'Technical Deep Dive',
      duration: 90,
      breakAfter: 30,
      requiredInterviewers: 2,
      order: 3,
      type: 'technical',
      meetingType: 'google_meet',
    },
    {
      id: 'session-4',
      name: 'System Design',
      duration: 90,
      breakAfter: 10080, // 1 week break (7 * 24 * 60 = 10080 minutes)
      requiredInterviewers: 2,
      order: 4,
      type: 'system_design',
      meetingType: 'google_meet',
    },

    // Round 3 - Day 9 (1 week later)
    {
      id: 'session-5',
      name: 'Cultural Fit',
      duration: 45,
      breakAfter: 30,
      requiredInterviewers: 1,
      order: 5,
      type: 'cultural_fit',
      meetingType: 'google_meet',
    },
    {
      id: 'session-6',
      name: 'Hiring Manager Interview',
      duration: 60,
      breakAfter: 0,
      requiredInterviewers: 1,
      order: 6,
      type: 'hiring_manager',
      meetingType: 'google_meet',
    },
  ];

  const interviewers: Interviewer[] = [
    {
      id: 'recruiter-1',
      name: 'Sarah Recruiter',
      email: 'sarah@company.com',
      timezone: { tzCode: 'America/New_York', tzOffset: -300 },
      workHours: {
        monday: { startTime: '09:00', endTime: '17:00' },
        tuesday: { startTime: '09:00', endTime: '17:00' },
        wednesday: { startTime: '09:00', endTime: '17:00' },
        thursday: { startTime: '09:00', endTime: '17:00' },
        friday: { startTime: '09:00', endTime: '17:00' },
      },
      limits: {
        daily: { type: 'count', max: 5 },
        weekly: { type: 'count', max: 20 },
      },
    },
    {
      id: 'eng-1',
      name: 'Alex Engineer',
      email: 'alex@company.com',
      timezone: { tzCode: 'America/New_York', tzOffset: -300 },
      workHours: {
        monday: { startTime: '10:00', endTime: '18:00' },
        tuesday: { startTime: '10:00', endTime: '18:00' },
        wednesday: { startTime: '10:00', endTime: '18:00' },
        thursday: { startTime: '10:00', endTime: '18:00' },
        friday: { startTime: '10:00', endTime: '18:00' },
      },
      limits: {
        daily: { type: 'hours', max: 3 },
        weekly: { type: 'hours', max: 10 },
      },
    },
    {
      id: 'eng-2',
      name: 'Maria Senior',
      email: 'maria@company.com',
      timezone: { tzCode: 'America/Los_Angeles', tzOffset: -480 },
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
    },
    {
      id: 'manager-1',
      name: 'David Manager',
      email: 'david@company.com',
      timezone: { tzCode: 'America/New_York', tzOffset: -300 },
      workHours: {
        monday: { startTime: '09:00', endTime: '17:00' },
        tuesday: { startTime: '09:00', endTime: '17:00' },
        wednesday: { startTime: '09:00', endTime: '17:00' },
        thursday: { startTime: '09:00', endTime: '17:00' },
        friday: { startTime: '09:00', endTime: '15:00' },
      },
      limits: {
        daily: { type: 'count', max: 2 },
        weekly: { type: 'count', max: 8 },
      },
    },
  ];

  console.log(`📋 Multi-Round Interview Process:`);
  console.log(`   Total sessions: ${sessions.length}`);
  console.log(`   Round 1: Phone Screen + Coding Review (Day 1)`);
  console.log(`   Round 2: Technical Deep Dive + System Design (Day 2)`);
  console.log(`   Round 3: Cultural Fit + Hiring Manager (Day 9)`);
  console.log(`   Total interview time: ${sessions.reduce((sum, s) => sum + s.duration, 0)} minutes`);
  console.log(`   Span: ~9 days\n`);

  console.log('🔍 Finding multi-day schedules...\n');

  try {
    const plans = await engine.findSlots({
      sessions,
      interviewers,
      dateRange: {
        start: '2024-02-05',
        end: '2024-02-29', // Give enough range for 1-week gaps
      },
      candidateTimezone: 'America/Los_Angeles',
      options: {
        maxResults: 5,
        respectWorkHours: true,
        respectDailyLimits: true,
        balanceLoad: true,
      },
    });

    console.log(`✅ Found ${plans.length} multi-day interview plans\n`);

    // Display first plan in detail
    if (plans.length > 0) {
      const plan = plans[0];

      if ('rounds' in plan) {
        console.log(`📅 Recommended Plan (Plan ID: ${plan.id}):\n`);
        console.log(`   Total Rounds: ${plan.totalRounds}`);
        console.log(`   Interviewers involved: ${plan.allInterviewers.length}\n`);

        for (const round of plan.rounds) {
          console.log(`   Round ${round.roundNumber + 1}: ${round.date}`);
          console.log(`   Time: ${round.combination.startTime.split('T')[1].substring(0, 5)} - ${round.combination.endTime.split('T')[1].substring(0, 5)}`);
          console.log(`   Duration: ${round.combination.totalDuration} minutes`);
          console.log(`   Sessions:`);

          for (const slot of round.combination.slots) {
            const time = slot.startTime.split('T')[1].substring(0, 5);
            const interviewers = slot.interviewers.map(i => i.name).join(', ');
            console.log(`     ${time} - ${slot.sessionName}`);
            console.log(`              ${interviewers}`);
            console.log(`              Type: ${slot.meetingType}`);
          }

          console.log();
        }

        // Timeline visualization
        console.log('📊 Timeline:');
        console.log('   ┌─────────────────────────────────────────┐');
        plan.rounds.forEach((round, index) => {
          const date = new Date(round.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          const sessionCount = round.combination.slots.length;
          console.log(`   │ Day ${index + 1}: ${date.padEnd(12)} (${sessionCount} session${sessionCount > 1 ? 's' : ''}) │`);
        });
        console.log('   └─────────────────────────────────────────┘');
        console.log();

        // Show alternative dates if multiple plans exist
        if (plans.length > 1) {
          console.log('📅 Alternative Schedules:\n');

          for (let i = 1; i < Math.min(3, plans.length); i++) {
            const altPlan = plans[i];
            if ('rounds' in altPlan) {
              console.log(`   Option ${i + 1}:`);
              altPlan.rounds.forEach((round, index) => {
                const date = new Date(round.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });
                console.log(`     Round ${index + 1}: ${date}`);
              });
              console.log();
            }
          }
        }

        // Verify and book the plan
        console.log('🔍 Verifying plan availability...\n');

        const verification = await engine.verifySlot(plan, interviewers);

        if (verification.isAvailable) {
          console.log('✅ All slots in plan are available!\n');

          console.log('📅 Booking multi-day interview plan...\n');

          const booking = await engine.bookSlot({
            slot: plan,
            candidate: {
              email: 'candidate@example.com',
              name: 'Jane Smith',
              timezone: 'America/Los_Angeles',
            },
            createCalendarEvents: true,
            sendNotifications: true,
            notes: 'Senior Backend Engineer - Full loop',
          });

          if (booking.status === 'confirmed') {
            console.log('✅ Multi-day interview plan booked successfully!\n');
            console.log(`   Booking ID: ${booking.id}`);
            console.log(`   Total interviews: ${booking.slots.length}`);
            console.log(`   Span: ${plan.rounds.length} days`);
            console.log(`   Calendar events: ${booking.calendarEventIds?.length || 0} created`);
            console.log();

            console.log('📧 Notifications sent to:');
            console.log(`   • Candidate: Jane Smith (candidate@example.com)`);

            const uniqueInterviewers = new Set(
              booking.slots.flatMap(s => s.interviewers.map(i => i.email))
            );
            uniqueInterviewers.forEach(email => {
              console.log(`   • Interviewer: ${email}`);
            });
          }
        } else {
          console.log('❌ Some slots are no longer available\n');
          console.log('Conflicts:');
          verification.conflicts.forEach(c => {
            console.log(`   • ${c.type}: ${c.message}`);
          });
        }
      }
    } else {
      console.log('❌ No multi-day plans found');
      console.log('\nThis could happen if:');
      console.log('   • Interviewers don\'t have availability on required days');
      console.log('   • Load limits prevent scheduling all sessions');
      console.log('   • Date range is too narrow for the week-long gaps');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n✨ Multi-day scheduling example completed!');
}

main().catch(console.error);
