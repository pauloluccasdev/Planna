import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const required = [
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'DATABASE_URL',
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}

const apiUrl = process.env.API_URL ?? 'http://localhost:3001/api/v1';
const keepTestUser = process.env.KEEP_TEST_USER === '1';
const cleanupOnly = process.env.CLEANUP_ONLY === '1';
const suffix = Date.now();
const email = `planna-it-${suffix}@example.com`;
const username = `planna_it_${suffix}`;
const password = `${randomUUID()}Aa1!`;
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
let userId;
let courseId;
let fixtureSessionId;
let fixtureEarlyBlockId;

async function withDatabase(callback) {
  const database = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });
  database.on('error', () => {});
  await database.connect();
  try {
    return await callback(database);
  } finally {
    await database.end().catch(() => {});
  }
}

async function cleanupUserData(database, id) {
  await database.query(
    'delete from study_session_completed_parts where study_session_id in (select id from study_sessions where student_id = $1)',
    [id],
  );
  await database.query(
    'delete from study_session_segments where study_session_id in (select id from study_sessions where student_id = $1)',
    [id],
  );
  await database.query('delete from study_sessions where student_id = $1', [
    id,
  ]);
  await database.query(
    'delete from study_block_parts where study_block_id in (select id from study_blocks where student_id = $1)',
    [id],
  );
  await database.query('delete from study_blocks where student_id = $1', [id]);
  await database.query('delete from recurrence_series where student_id = $1', [
    id,
  ]);
  await database.query(
    'delete from academic_event_contents where academic_event_id in (select id from academic_events where student_id = $1)',
    [id],
  );
  await database.query('delete from academic_events where student_id = $1', [
    id,
  ]);
  await database.query(
    'delete from pomodoro_preferences where student_id = $1',
    [id],
  );
  await database.query(
    'delete from availability_intervals where student_id = $1',
    [id],
  );
  await database.query('delete from content_parts where student_id = $1', [id]);
  await database.query('delete from contents where student_id = $1', [id]);
  await database.query('delete from subjects where student_id = $1', [id]);
  await database.query(
    'delete from academic_periods where course_id in (select id from courses where student_id = $1)',
    [id],
  );
  await database.query('delete from courses where student_id = $1', [id]);
  await database.query('delete from user_accounts where id = $1', [id]);
}

async function cleanupStaleSmokeUsers() {
  const staleIds = await withDatabase(async (database) => {
    const result = await database.query(
      "select id from user_accounts where username like 'planna_it_%'",
    );
    for (const { id } of result.rows) await cleanupUserData(database, id);
    return result.rows.map(({ id }) => id);
  });
  for (const id of staleIds)
    await admin.auth.admin.deleteUser(id).catch(() => {});
}

try {
  await cleanupStaleSmokeUsers();
  if (cleanupOnly) {
    console.log(JSON.stringify({ staleSmokeUsersCleaned: true }));
    process.exit(0);
  }
  const createdUser = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createdUser.error) throw createdUser.error;
  userId = createdUser.data.user.id;

  await withDatabase((database) =>
    database.query(
      `insert into user_accounts
        (id, username, username_normalized, email, email_normalized, email_verified_at, updated_at)
       values ($1, $2, $3, $4, $5, now(), now())`,
      [userId, username, username, email, email],
    ),
  );

  const signedIn = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!signedIn.ok) {
    throw new Error(
      `POST /auth/login failed with ${signedIn.status}: ${await signedIn.text()}`,
    );
  }
  const loginBody = await signedIn.json();
  const headers = {
    authorization: `Bearer ${loginBody.data.session.accessToken}`,
    'content-type': 'application/json',
  };

  const me = await fetch(`${apiUrl}/me`, { headers });
  if (!me.ok) throw new Error(`GET /me failed with ${me.status}`);

  const createdCourse = await fetch(`${apiUrl}/courses`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Curso de integração' }),
  });
  if (createdCourse.status !== 201) {
    throw new Error(
      `POST /courses failed with ${createdCourse.status}: ${await createdCourse.text()}`,
    );
  }
  courseId = (await createdCourse.json()).data.id;

  const listedCourses = await fetch(`${apiUrl}/courses`, { headers });
  const listBody = await listedCourses.json();
  if (
    !listedCourses.ok ||
    !listBody.data.some((item) => item.id === courseId)
  ) {
    throw new Error('GET /courses did not return the created course');
  }

  const updatedCourse = await fetch(`${apiUrl}/courses/${courseId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      name: 'Curso de integração atualizado',
      description: 'Descrição do curso de integração',
    }),
  });
  const updatedCourseBody = await updatedCourse.json();
  if (
    !updatedCourse.ok ||
    updatedCourseBody.data.name !== 'Curso de integração atualizado' ||
    updatedCourseBody.data.description !== 'Descrição do curso de integração'
  ) {
    throw new Error('Course was not updated');
  }

  const createdSubject = await fetch(`${apiUrl}/courses/${courseId}/subjects`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Disciplina de integração' }),
  });
  if (createdSubject.status !== 201) {
    throw new Error(`POST /subjects failed with ${createdSubject.status}`);
  }
  const subjectId = (await createdSubject.json()).data.id;

  const createdPeriod = await fetch(`${apiUrl}/courses/${courseId}/periods`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: '2026.2',
      startsOn: '2026-08-01',
      endsOn: '2026-12-20',
    }),
  });
  if (createdPeriod.status !== 201) {
    throw new Error(
      `POST /periods failed with ${createdPeriod.status}: ${await createdPeriod.text()}`,
    );
  }
  const periodId = (await createdPeriod.json()).data.id;
  const updatedPeriod = await fetch(`${apiUrl}/periods/${periodId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      name: 'Segundo semestre',
      startsOn: '2026-08-03',
      endsOn: '2026-12-18',
    }),
  });
  const updatedPeriodBody = await updatedPeriod.json();
  if (
    !updatedPeriod.ok ||
    updatedPeriodBody.data.name !== 'Segundo semestre' ||
    !updatedPeriodBody.data.startsOn.startsWith('2026-08-03') ||
    !updatedPeriodBody.data.endsOn.startsWith('2026-12-18')
  ) {
    throw new Error('Academic period was not updated');
  }
  const updatedSubject = await fetch(`${apiUrl}/subjects/${subjectId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      name: 'Disciplina de integração atualizada',
      description: 'Descrição da disciplina de integração',
      academicPeriodId: periodId,
    }),
  });
  const updatedSubjectBody = await updatedSubject.json();
  if (
    !updatedSubject.ok ||
    updatedSubjectBody.data.name !== 'Disciplina de integração atualizada' ||
    updatedSubjectBody.data.academicPeriodId !== periodId
  ) {
    throw new Error('Subject was not updated with its academic period');
  }

  const createdContent = await fetch(
    `${apiUrl}/subjects/${subjectId}/contents`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Conteúdo de integração',
        priority: 5,
        estimatedDurationSeconds: 3600,
      }),
    },
  );
  if (createdContent.status !== 201) {
    throw new Error(`POST /contents failed with ${createdContent.status}`);
  }
  const contentId = (await createdContent.json()).data.id;

  const eventTypes = await fetch(`${apiUrl}/academic-event-types`, { headers });
  const eventTypesBody = await eventTypes.json();
  if (!eventTypes.ok || eventTypesBody.data.length === 0) {
    throw new Error('GET /academic-event-types did not return a system type');
  }
  const eventTypeId = eventTypesBody.data[0].id;
  const createdEvent = await fetch(`${apiUrl}/academic-events`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      subjectId,
      eventTypeId,
      title: 'Avaliação de integração',
      startsAt: '2099-09-01T19:00:00-03:00',
      contentsStatus: 'NOT_INFORMED_YET',
      contentIds: [],
    }),
  });
  if (createdEvent.status !== 201) {
    throw new Error(
      `POST /academic-events failed with ${createdEvent.status}: ${await createdEvent.text()}`,
    );
  }
  const eventId = (await createdEvent.json()).data.id;
  const updatedEvent = await fetch(`${apiUrl}/academic-events/${eventId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      title: 'Avaliação de integração atualizada',
      description: 'Conteúdo divulgado pelo professor',
      startsAt: '2099-09-02T19:30:00-03:00',
      endsAt: '2099-09-02T20:30:00-03:00',
      contentsStatus: 'INFORMED',
      contentIds: [contentId],
    }),
  });
  const updatedEventBody = await updatedEvent.json();
  if (
    !updatedEvent.ok ||
    updatedEventBody.data.title !== 'Avaliação de integração atualizada' ||
    updatedEventBody.data.contentsStatus !== 'INFORMED' ||
    updatedEventBody.data.contentLinks.length !== 1
  ) {
    throw new Error(
      'Academic event and its contents were not updated together',
    );
  }
  const rejectedEventUpdate = await fetch(
    `${apiUrl}/academic-events/${eventId}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        title: 'Não deve persistir',
        contentsStatus: 'INFORMED',
        contentIds: [randomUUID()],
      }),
    },
  );
  if (rejectedEventUpdate.status !== 422) {
    throw new Error('Invalid academic event content should return 422');
  }
  const eventAfterRejectedUpdate = await fetch(
    `${apiUrl}/academic-events/${eventId}`,
    { headers },
  );
  const eventAfterRejectedUpdateBody = await eventAfterRejectedUpdate.json();
  if (
    !eventAfterRejectedUpdate.ok ||
    eventAfterRejectedUpdateBody.data.title !==
      'Avaliação de integração atualizada'
  ) {
    throw new Error(
      'Rejected academic event update partially changed metadata',
    );
  }

  const availability = await fetch(`${apiUrl}/availability`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      intervals: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        weekday,
        startLocalTime: '00:00',
        endLocalTime: '23:59',
      })),
    }),
  });
  if (!availability.ok)
    throw new Error(`PUT /availability failed with ${availability.status}`);

  const pomodoro = await fetch(`${apiUrl}/pomodoro-preference`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ focusSeconds: 1500, breakSeconds: 300 }),
  });
  if (!pomodoro.ok)
    throw new Error(`PUT /pomodoro-preference failed with ${pomodoro.status}`);

  const createdBlock = await fetch(`${apiUrl}/study-blocks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      contentId,
      startsAt: '2099-08-03T19:00:00-03:00',
      endsAt: '2099-08-03T20:00:00-03:00',
    }),
  });
  if (createdBlock.status !== 201) {
    throw new Error(
      `POST /study-blocks failed with ${createdBlock.status}: ${await createdBlock.text()}`,
    );
  }
  const blockId = (await createdBlock.json()).data.id;

  const updatedBlock = await fetch(`${apiUrl}/study-blocks/${blockId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      revision: 1,
      focusSeconds: 1200,
      breakSeconds: 300,
      partIds: [],
    }),
  });
  const updatedBlockBody = await updatedBlock.json();
  if (
    !updatedBlock.ok ||
    updatedBlockBody.data.revision !== 2 ||
    updatedBlockBody.data.focusSeconds !== 1200
  ) {
    throw new Error('Future study block was not updated');
  }
  const blockHistory = await fetch(
    `${apiUrl}/study-blocks/${blockId}/history`,
    { headers },
  );
  const blockHistoryBody = await blockHistory.json();
  if (
    !blockHistory.ok ||
    blockHistoryBody.data.length !== 1 ||
    blockHistoryBody.data[0].versionNumber !== 1 ||
    blockHistoryBody.data[0].snapshot.focusSeconds !== 1500
  ) {
    throw new Error('Study block previous version was not preserved');
  }
  const staleBlockUpdate = await fetch(`${apiUrl}/study-blocks/${blockId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      revision: 1,
      focusSeconds: 1500,
      breakSeconds: 300,
    }),
  });
  if (staleBlockUpdate.status !== 409) {
    throw new Error('Stale study block update should return 409');
  }

  const overlappingBlock = await fetch(`${apiUrl}/study-blocks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      contentId,
      startsAt: '2099-08-03T19:30:00-03:00',
      endsAt: '2099-08-03T20:30:00-03:00',
    }),
  });
  if (overlappingBlock.status !== 409) {
    throw new Error(
      `Overlapping block should return 409, received ${overlappingBlock.status}`,
    );
  }

  const recurringBlocks = await fetch(
    `${apiUrl}/study-blocks/recurring/daily`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contentId,
        startsAt: '2099-08-04T19:00:00-03:00',
        endsAt: '2099-08-04T20:00:00-03:00',
        repeatUntil: '2099-08-06',
      }),
    },
  );
  if (recurringBlocks.status !== 201) {
    throw new Error(
      `Creating daily recurrence failed with ${recurringBlocks.status}: ${await recurringBlocks.text()}`,
    );
  }
  const recurringBody = await recurringBlocks.json();
  if (
    recurringBody.data.length !== 3 ||
    new Set(recurringBody.data.map((block) => block.recurrenceSeriesId))
      .size !== 1
  ) {
    throw new Error('Daily recurrence did not create one three-block series');
  }

  const blocksBeforeRejectedRecurrence = await withDatabase(
    async (database) => {
      const result = await database.query(
        'select count(*)::int as count from study_blocks where student_id = $1',
        [userId],
      );
      return result.rows[0].count;
    },
  );
  const conflictingRecurrence = await fetch(
    `${apiUrl}/study-blocks/recurring/daily`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contentId,
        startsAt: '2099-08-02T19:30:00-03:00',
        endsAt: '2099-08-02T20:30:00-03:00',
        repeatUntil: '2099-08-04',
      }),
    },
  );
  if (conflictingRecurrence.status !== 409) {
    throw new Error(
      `Conflicting recurrence should return 409, received ${conflictingRecurrence.status}`,
    );
  }
  const blocksAfterRejectedRecurrence = await withDatabase(async (database) => {
    const result = await database.query(
      'select count(*)::int as count from study_blocks where student_id = $1',
      [userId],
    );
    return result.rows[0].count;
  });
  if (blocksAfterRejectedRecurrence !== blocksBeforeRejectedRecurrence) {
    throw new Error('Rejected recurrence created a partial series');
  }

  const expiredBlock = await fetch(`${apiUrl}/study-blocks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      contentId,
      startsAt: '2020-01-08T18:00:00-03:00',
      endsAt: '2020-01-08T19:00:00-03:00',
    }),
  });
  if (expiredBlock.status !== 201) {
    throw new Error(
      `Creating expired block failed with ${expiredBlock.status}`,
    );
  }
  const expiredBlockId = (await expiredBlock.json()).data.id;
  const reconciledBlock = await fetch(
    `${apiUrl}/study-blocks/${expiredBlockId}`,
    {
      headers,
    },
  );
  const reconciledBlockBody = await reconciledBlock.json();
  if (!reconciledBlock.ok || reconciledBlockBody.data.status !== 'OVERDUE') {
    throw new Error('Expired block was not automatically marked overdue');
  }

  const startedSession = await fetch(
    `${apiUrl}/study-blocks/${blockId}/sessions/start`,
    { method: 'POST', headers },
  );
  if (startedSession.status !== 201) {
    throw new Error(
      `Starting planned session failed with ${startedSession.status}`,
    );
  }
  const sessionId = (await startedSession.json()).data.id;

  const secondSession = await fetch(
    `${apiUrl}/study-sessions/unplanned/start`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ contentId }),
    },
  );
  if (secondSession.status !== 409) {
    throw new Error(
      `A second running session should return 409, received ${secondSession.status}`,
    );
  }

  const breakSession = await fetch(
    `${apiUrl}/study-sessions/${sessionId}/pomodoro-break`,
    { method: 'POST', headers },
  );
  if (!breakSession.ok) {
    throw new Error(
      `Starting Pomodoro break failed with ${breakSession.status}: ${await breakSession.text()}`,
    );
  }

  const focusSession = await fetch(
    `${apiUrl}/study-sessions/${sessionId}/focus`,
    {
      method: 'POST',
      headers,
    },
  );
  if (!focusSession.ok) throw new Error('Resuming Pomodoro focus failed');

  const pausedSession = await fetch(
    `${apiUrl}/study-sessions/${sessionId}/pause`,
    {
      method: 'POST',
      headers,
    },
  );
  if (!pausedSession.ok) throw new Error('Pausing session failed');

  const resumedSession = await fetch(
    `${apiUrl}/study-sessions/${sessionId}/resume`,
    {
      method: 'POST',
      headers,
    },
  );
  if (!resumedSession.ok) throw new Error('Resuming session failed');

  const completedSession = await fetch(
    `${apiUrl}/study-sessions/${sessionId}/complete`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ note: 'Sessão de integração concluída' }),
    },
  );
  if (!completedSession.ok) throw new Error('Completing session failed');
  const completedBody = await completedSession.json();
  if (completedBody.data.status !== 'COMPLETED') {
    throw new Error('Session did not transition to COMPLETED');
  }

  const retroactiveSession = await fetch(
    `${apiUrl}/study-sessions/retroactive`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contentId,
        startedAt: '2020-01-10T19:00:00-03:00',
        endedAt: '2020-01-10T20:00:00-03:00',
        pomodoroBreakDurationSeconds: 600,
        note: 'Registro retroativo de integração',
      }),
    },
  );
  if (retroactiveSession.status !== 201) {
    throw new Error(
      `Creating retroactive session failed with ${retroactiveSession.status}`,
    );
  }
  const retroactiveBody = await retroactiveSession.json();
  if (
    retroactiveBody.data.realizedDurationSeconds !== 3600 ||
    retroactiveBody.data.focusDurationSeconds !== 3000
  ) {
    throw new Error(
      'Retroactive session durations were not calculated correctly',
    );
  }

  const metrics = await fetch(
    `${apiUrl}/metrics/summary?from=2020-01-01T00%3A00%3A00-03%3A00&to=2100-01-01T00%3A00%3A00-03%3A00`,
    { headers },
  );
  if (!metrics.ok)
    throw new Error(`GET /metrics/summary failed with ${metrics.status}`);
  const metricsBody = await metrics.json();
  if (
    metricsBody.data.compliance.eligibleBlocks !== 5 ||
    metricsBody.data.compliance.completedBlocks !== 1 ||
    metricsBody.data.time.plannedCompletedSeconds !== 3600 ||
    metricsBody.data.time.additionalUnplanned.realizedSeconds !== 3600 ||
    metricsBody.data.adaptation.currentOverdueBlocks !== 1
  ) {
    throw new Error('Planned versus realized metrics are inconsistent');
  }

  const calendar = await fetch(
    `${apiUrl}/calendar?from=2099-08-01T00%3A00%3A00-03%3A00&to=2099-08-10T00%3A00%3A00-03%3A00`,
    { headers },
  );
  if (!calendar.ok)
    throw new Error(`GET /calendar failed with ${calendar.status}`);
  const calendarBody = await calendar.json();
  if (
    calendarBody.data.length !== 4 ||
    !calendarBody.data.some(
      (item) => item.type === 'study_block' && item.id === blockId,
    )
  ) {
    throw new Error('Calendar did not return the expected study block');
  }

  const seriesId = recurringBody.data[0].recurrenceSeriesId;
  const cancelledSeries = await fetch(
    `${apiUrl}/study-blocks/series/${seriesId}/cancel`,
    { method: 'POST', headers },
  );
  if (cancelledSeries.status !== 201) {
    throw new Error(
      `Cancelling recurrence failed with ${cancelledSeries.status}: ${await cancelledSeries.text()}`,
    );
  }
  const cancelledSeriesBody = await cancelledSeries.json();
  if (cancelledSeriesBody.data.cancelledBlocks !== 3) {
    throw new Error(
      'Cancelling recurrence did not affect all active occurrences',
    );
  }
  const remainingCalendar = await fetch(
    `${apiUrl}/calendar?from=2099-08-01T00%3A00%3A00-03%3A00&to=2099-08-10T00%3A00%3A00-03%3A00`,
    { headers },
  );
  const remainingCalendarBody = await remainingCalendar.json();
  if (
    !remainingCalendar.ok ||
    remainingCalendarBody.data.length !== 1 ||
    remainingCalendarBody.data[0].id !== blockId
  ) {
    throw new Error('Cancelled recurrence still appears in the calendar');
  }

  if (keepTestUser) {
    const today = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const yesterdayValue = new Date(`${today}T12:00:00Z`);
    yesterdayValue.setUTCDate(yesterdayValue.getUTCDate() - 1);
    const yesterday = yesterdayValue.toISOString().slice(0, 10);
    const tomorrowValue = new Date(`${today}T12:00:00Z`);
    tomorrowValue.setUTCDate(tomorrowValue.getUTCDate() + 1);
    const tomorrow = tomorrowValue.toISOString().slice(0, 10);
    const createFixtureBlock = async (startsAt, endsAt) => {
      const response = await fetch(`${apiUrl}/study-blocks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ contentId, startsAt, endsAt }),
      });
      if (response.status !== 201) {
        throw new Error(
          `Creating browser fixture block failed with ${response.status}`,
        );
      }
      return (await response.json()).data;
    };
    const currentFixtureBlock = await createFixtureBlock(
      `${yesterday}T18:00:00-03:00`,
      `${yesterday}T19:00:00-03:00`,
    );
    await createFixtureBlock(
      `${yesterday}T19:00:00-03:00`,
      `${yesterday}T20:00:00-03:00`,
    );
    fixtureEarlyBlockId = (
      await createFixtureBlock(
        `${tomorrow}T10:00:00-03:00`,
        `${tomorrow}T11:00:00-03:00`,
      )
    ).id;
    const fixtureSession = await fetch(
      `${apiUrl}/study-blocks/${currentFixtureBlock.id}/sessions/start`,
      { method: 'POST', headers },
    );
    if (fixtureSession.status !== 201) {
      throw new Error(
        `Starting browser fixture session failed with ${fixtureSession.status}`,
      );
    }
    fixtureSessionId = (await fixtureSession.json()).data.id;
  }

  console.log(
    JSON.stringify({
      authenticated: true,
      profileResolved: true,
      courseCreated: true,
      courseListed: true,
      courseUpdated: true,
      subjectCreated: true,
      academicPeriodUpdated: true,
      subjectUpdatedWithAcademicPeriod: true,
      contentCreated: true,
      academicEventUpdatedAtomically: true,
      availabilitySaved: true,
      pomodoroSaved: true,
      studyBlockCreated: true,
      studyBlockUpdatedWithHistory: true,
      staleStudyBlockUpdateRejected: true,
      overlappingBlockRejected: true,
      dailyRecurrenceCreated: true,
      recurrenceSeriesPersisted: true,
      conflictingRecurrenceRejectedAtomically: true,
      expiredBlockMarkedOverdue: true,
      plannedSessionStarted: true,
      concurrentSessionRejected: true,
      pomodoroBreakRecorded: true,
      pomodoroFocusResumed: true,
      sessionPaused: true,
      sessionResumed: true,
      sessionCompleted: true,
      retroactiveSessionCreated: true,
      metricsCalculated: true,
      calendarListed: true,
      recurrenceCancelled: true,
      cancelledRecurrenceHiddenFromCalendar: true,
      cleanupScheduled: true,
      ...(keepTestUser
        ? {
            fixture: {
              username,
              password,
              userId,
              courseId,
              periodId,
              subjectId,
              sessionId: fixtureSessionId,
              earlyBlockId: fixtureEarlyBlockId,
            },
          }
        : {}),
    }),
  );
} finally {
  if (userId && !keepTestUser) {
    await withDatabase((database) => cleanupUserData(database, userId)).catch(
      () => {},
    );
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
}
