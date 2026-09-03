import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const required = [
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'DIRECT_URL',
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}

const apiUrl = process.env.API_URL ?? 'http://localhost:3001/api/v1';
const suffix = Date.now();
const email = `planna-it-${suffix}@example.com`;
const username = `planna_it_${suffix}`;
const password = `${randomUUID()}Aa1!`;
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const publicClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const database = new pg.Client({ connectionString: process.env.DIRECT_URL });
let databaseConnected = false;
let userId;
let courseId;

try {
  await database.connect();
  databaseConnected = true;
  const createdUser = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createdUser.error) throw createdUser.error;
  userId = createdUser.data.user.id;

  await database.query(
    `insert into user_accounts
      (id, username, username_normalized, email, email_normalized, email_verified_at, updated_at)
     values ($1, $2, $3, $4, $5, now(), now())`,
    [userId, username, username, email, email],
  );

  const signedIn = await publicClient.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  const headers = {
    authorization: `Bearer ${signedIn.data.session.access_token}`,
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
    throw new Error(`POST /courses failed with ${createdCourse.status}: ${await createdCourse.text()}`);
  }
  courseId = (await createdCourse.json()).data.id;

  const listedCourses = await fetch(`${apiUrl}/courses`, { headers });
  const listBody = await listedCourses.json();
  if (!listedCourses.ok || !listBody.data.some((item) => item.id === courseId)) {
    throw new Error('GET /courses did not return the created course');
  }

  const deletedCourse = await fetch(`${apiUrl}/courses/${courseId}`, { method: 'DELETE', headers });
  if (deletedCourse.status !== 204) {
    throw new Error(`DELETE /courses failed with ${deletedCourse.status}`);
  }
  courseId = undefined;

  console.log(
    JSON.stringify({
      authenticated: true,
      profileResolved: true,
      courseCreated: true,
      courseListed: true,
      courseDeleted: true,
      cleanupScheduled: true,
    }),
  );
} finally {
  if (databaseConnected) {
    if (courseId) await database.query('delete from courses where id = $1', [courseId]).catch(() => {});
    if (userId) await database.query('delete from user_accounts where id = $1', [userId]).catch(() => {});
    await database.end();
  }
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {});
}
