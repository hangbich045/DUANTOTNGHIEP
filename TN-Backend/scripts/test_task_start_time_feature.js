require('dotenv').config();
const { sequelize } = require('../src/config/database');
const { Task, User } = require('../src/models');
const taskService = require('../src/services/task.service');
const dutyService = require('../src/services/duty.service');

async function runTest() {
  console.log('=== TESTING TASK START TIME FEATURE ===');
  await sequelize.authenticate();
  console.log('Connected to MSSQL database successfully.');

  // Find an admin and a collaborator
  const admin = await User.findOne({ where: { role: 'ADMIN' } });
  const ctv = await User.findOne({ where: { role: 'COLLABORATOR' } });

  if (!admin || !ctv) {
    throw new Error('Admin or CTV not found in database');
  }

  console.log(`Using Admin: ${admin.fullName} (${admin.id})`);
  console.log(`Using CTV: ${ctv.fullName} (${ctv.id})`);

  const testStartTimeIso = '2026-11-20T08:30:00.000Z';
  const testExecutionDate = '2026-11-20';

  // 1. Create a media task (Chụp ảnh) with startTime
  console.log('\n--- 1. Testing Create Media Task (Chụp ảnh) with startTime ---');
  const mediaTask = await taskService.createTask(
    {
      title: 'Chụp ảnh lễ khai giảng test',
      description: 'Chụp ảnh sự kiện toàn trường',
      assignedToUserId: ctv.id,
      taskType: 'Chụp ảnh',
      campus: 'Cơ sở 1',
      room: 'Hội trường A',
      location: 'Cơ sở 1 - Hội trường A',
      startTime: testStartTimeIso,
      shiftSession: 'S',
      executionDate: testExecutionDate,
    },
    admin
  );

  console.log('Created media task ID:', mediaTask.id);
  console.log('Saved startTime:', mediaTask.startTime);
  console.log('Saved deadline:', mediaTask.deadline);
  console.log('Saved executionDate:', mediaTask.executionDate);

  if (!mediaTask.startTime) throw new Error('FAIL: startTime was not saved!');
  if (mediaTask.deadline !== null) throw new Error('FAIL: deadline should be null for media task!');

  // 2. Create a non-media task (Viết content) with deadline
  console.log('\n--- 2. Testing Create Non-Media Task (Viết content) with deadline ---');
  const deadlineIso = '2026-11-20T17:00:00.000Z';
  const nonMediaTask = await taskService.createTask(
    {
      title: 'Viết bài truyền thông test',
      description: 'Viết bài tổng kết',
      assignedToUserId: ctv.id,
      taskType: 'Viết content',
      deadline: deadlineIso,
      shiftSession: 'C',
      executionDate: testExecutionDate,
    },
    admin
  );

  console.log('Created non-media task ID:', nonMediaTask.id);
  console.log('Saved startTime:', nonMediaTask.startTime);
  console.log('Saved deadline:', nonMediaTask.deadline);

  if (nonMediaTask.startTime !== null) throw new Error('FAIL: startTime should be null for content task!');
  if (!nonMediaTask.deadline) throw new Error('FAIL: deadline was not saved!');

  // 3. Test dutyService.getWeeklySchedule formatting
  console.log('\n--- 3. Testing getWeeklySchedule and Popup executionTimeFormatted ---');
  const schedule = await dutyService.getWeeklySchedule(testExecutionDate);
  const ctvRow = schedule.rows.find((r) => r.user.id === ctv.id);
  if (!ctvRow) throw new Error('FAIL: CTV row not found in weekly schedule');

  const daySlot = ctvRow.days[testExecutionDate];
  if (!daySlot) throw new Error('FAIL: Day slot not found for date');

  const mediaTaskInSchedule = daySlot.dayTasks.find((t) => t.id === mediaTask.id);
  if (!mediaTaskInSchedule) throw new Error('FAIL: Media task not found in dayTasks!');

  console.log('Media Task executionTimeFormatted:', mediaTaskInSchedule.executionTimeFormatted);
  console.log('Media Task fullDisplay:', mediaTaskInSchedule.fullDisplay);

  if (!mediaTaskInSchedule.startTime) throw new Error('FAIL: startTime missing in task metadata');
  if (!mediaTaskInSchedule.executionTimeFormatted || !mediaTaskInSchedule.executionTimeFormatted.includes('20/11/2026')) {
    throw new Error('FAIL: executionTimeFormatted does not contain formatted VN date!');
  }

  const nonMediaTaskInSchedule = daySlot.dayTasks.find((t) => t.id === nonMediaTask.id);
  if (!nonMediaTaskInSchedule) throw new Error('FAIL: Non-media task not found in dayTasks!');
  console.log('Non-media Task executionTimeFormatted:', nonMediaTaskInSchedule.executionTimeFormatted);
  if (!nonMediaTaskInSchedule.executionTimeFormatted.includes('Hạn chót:')) {
    throw new Error('FAIL: Non-media task executionTimeFormatted should show "Hạn chót:"');
  }

  // 4. Test Update Media Task startTime
  console.log('\n--- 4. Testing Update Media Task startTime ---');
  const updatedStartTimeIso = '2026-11-20T14:15:00.000Z';
  const updatedTask = await taskService.updateTask(
    mediaTask.id,
    {
      startTime: updatedStartTimeIso,
      title: 'Chụp ảnh lễ khai giảng test (Updated)',
      taskType: 'Chụp ảnh',
      campus: 'Cơ sở 2',
      room: 'Phòng 201',
    },
    admin
  );

  console.log('Updated startTime:', updatedTask.startTime);
  if (new Date(updatedTask.startTime).getTime() !== new Date(updatedStartTimeIso).getTime()) {
    throw new Error('FAIL: Updated startTime did not match!');
  }

  // Check schedule reflection
  const scheduleAfterUpdate = await dutyService.getWeeklySchedule(testExecutionDate);
  const updatedMediaInSchedule = scheduleAfterUpdate.rows
    .find((r) => r.user.id === ctv.id)
    .days[testExecutionDate].dayTasks.find((t) => t.id === mediaTask.id);

  console.log('Schedule executionTimeFormatted after update:', updatedMediaInSchedule.executionTimeFormatted);

  // 5. Cleanup test data
  console.log('\n--- 5. Cleanup test tasks ---');
  await Task.destroy({ where: { id: [mediaTask.id, nonMediaTask.id] } });
  console.log('Cleanup completed.');

  console.log('\n=== ALL TASK START TIME TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
