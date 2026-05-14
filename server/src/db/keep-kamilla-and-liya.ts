import bcrypt from 'bcryptjs';
import { pool } from './index.js';

const ACCOUNTS = {
  kamilla: {
    email: 'kamilla@qazaq.gen',
    password: 'kamilla123',
    name: 'Камилла Мұхитдинова',
    role: 'admin',
  },
  liya: {
    email: 'liya@qazaq.gen',
    password: 'liya123',
    name: 'Лия Жарылкасын',
    role: 'employee',
  },
} as const;

async function findKamillaUserId() {
  const result = await pool.query<{ id: string }>(
    `select u.id
     from users u
     left join profiles p on p.user_id = u.id
     where u.email = $1 or p.name ilike '%Камилла%'
     order by case when u.email = $1 then 0 else 1 end
     limit 1`,
    [ACCOUNTS.kamilla.email],
  );

  return result.rows[0]?.id;
}

async function findUserIdByEmail(email: string) {
  const result = await pool.query<{ id: string }>('select id from users where email = $1 limit 1', [email]);
  return result.rows[0]?.id;
}

async function ensureUser(account: typeof ACCOUNTS.kamilla | typeof ACCOUNTS.liya, existingUserId?: string) {
  const passwordHash = await bcrypt.hash(account.password, 12);
  const department = await pool.query<{ id: string }>('select id from departments limit 1');
  const departmentId = department.rows[0]?.id ?? null;

  let userId = existingUserId;

  if (userId) {
    await pool.query(
      'update users set email = $1, password_hash = $2, totp_secret = null, totp_enabled = false where id = $3',
      [account.email, passwordHash, userId],
    );
  } else {
    const inserted = await pool.query<{ id: string }>(
      'insert into users (email, password_hash, totp_secret, totp_enabled) values ($1, $2, null, false) returning id',
      [account.email, passwordHash],
    );
    userId = inserted.rows[0].id;
  }

  await pool.query(
    `insert into profiles (user_id, email, name, department_id)
     values ($1, $2, $3, $4)
     on conflict (user_id) do update
       set email = excluded.email,
           name = excluded.name,
           department_id = excluded.department_id,
           updated_at = now()`,
    [userId, account.email, account.name, departmentId],
  );

  await pool.query('delete from user_roles where user_id = $1', [userId]);
  await pool.query('insert into user_roles (user_id, role) values ($1, $2)', [userId, account.role]);

  return userId;
}

async function keepOnlyKamillaAndLiya() {
  console.log('Keeping only Kamilla and Liya accounts...');

  await pool.query('begin');
  try {
    const kamillaUserId = await ensureUser(ACCOUNTS.kamilla, await findKamillaUserId());
    const liyaUserId = await ensureUser(ACCOUNTS.liya, await findUserIdByEmail(ACCOUNTS.liya.email));
    const keeperIds = [kamillaUserId, liyaUserId];

    await pool.query('delete from chat_rooms');

    await pool.query('update tickets set requester_id = $1 where requester_id <> all($2::uuid[])', [kamillaUserId, keeperIds]);
    await pool.query('update tickets set assignee_id = $1 where assignee_id is not null and assignee_id <> all($2::uuid[])', [kamillaUserId, keeperIds]);
    await pool.query('update ticket_comments set author_id = $1 where author_id <> all($2::uuid[])', [kamillaUserId, keeperIds]);
    await pool.query('update ticket_history set actor_id = $1 where actor_id <> all($2::uuid[])', [kamillaUserId, keeperIds]);
    await pool.query('update ticket_attachments set uploaded_by = $1 where uploaded_by <> all($2::uuid[])', [kamillaUserId, keeperIds]);
    await pool.query('update ppr_plans set created_by = $1 where created_by <> all($2::uuid[])', [kamillaUserId, keeperIds]);
    await pool.query('update ppr_plans set assigned_to = $1 where assigned_to is not null and assigned_to <> all($2::uuid[])', [kamillaUserId, keeperIds]);
    await pool.query('update ppr_plans set signed_by_executor = $1 where signed_by_executor is not null and signed_by_executor <> all($2::uuid[])', [kamillaUserId, keeperIds]);
    await pool.query('update ppr_plans set signed_by_manager = $1 where signed_by_manager is not null and signed_by_manager <> all($2::uuid[])', [kamillaUserId, keeperIds]);
    await pool.query('update notifications set to_user_id = $1 where to_user_id <> all($2::uuid[])', [kamillaUserId, keeperIds]);
    await pool.query('update performance_scores set user_id = $1 where user_id <> all($2::uuid[])', [kamillaUserId, keeperIds]);
    await pool.query('update reports set author_id = $1 where author_id <> all($2::uuid[])', [kamillaUserId, keeperIds]);
    await pool.query('update shared_documents set sender_id = $1 where sender_id <> all($2::uuid[])', [kamillaUserId, keeperIds]);
    await pool.query('update shared_documents set recipient_id = $1 where recipient_id <> all($2::uuid[])', [liyaUserId, keeperIds]);
    await pool.query('update kb_articles set author_id = $1 where author_id <> all($2::uuid[])', [kamillaUserId, keeperIds]);
    await pool.query('update ticket_kb_links set linked_by = $1 where linked_by <> all($2::uuid[])', [kamillaUserId, keeperIds]);
    await pool.query('update assets set assigned_to = $1 where assigned_to is not null and assigned_to <> all($2::uuid[])', [kamillaUserId, keeperIds]);

    await pool.query('delete from users where id <> all($1::uuid[])', [keeperIds]);
    await pool.query('commit');

    console.log(`Done. Kamilla: ${ACCOUNTS.kamilla.email} / ${ACCOUNTS.kamilla.password} / ${ACCOUNTS.kamilla.role}`);
    console.log(`Done. Liya: ${ACCOUNTS.liya.email} / ${ACCOUNTS.liya.password} / ${ACCOUNTS.liya.role}`);
  } catch (error) {
    await pool.query('rollback');
    throw error;
  }
}

keepOnlyKamillaAndLiya()
  .catch((error) => {
    console.error('Failed to keep only Kamilla and Liya:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
