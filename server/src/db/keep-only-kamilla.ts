import bcrypt from 'bcryptjs';
import { eq, ilike } from 'drizzle-orm';
import { db, pool } from './index.js';
import { profiles, userRoles, users } from './schema.js';

const KAMILLA_ACCOUNT = {
  email: 'kamilla@qazaq.gen',
  password: 'kamilla123',
  name: 'Камилла Мұхитдинова',
  role: 'admin' as const,
};

async function keepOnlyKamilla() {
  console.log('Normalizing Kamilla account...');

  const [kamillaProfile] = await db.select().from(profiles).where(ilike(profiles.name, '%Камилла%')).limit(1);
  if (!kamillaProfile) {
    throw new Error('Kamilla profile was not found');
  }

  const kamillaUserId = kamillaProfile.userId;
  const passwordHash = await bcrypt.hash(KAMILLA_ACCOUNT.password, 12);

  await pool.query('begin');
  try {
    await db.update(users)
      .set({
        email: KAMILLA_ACCOUNT.email,
        passwordHash,
      })
      .where(eq(users.id, kamillaUserId));

    await db.update(profiles)
      .set({
        email: KAMILLA_ACCOUNT.email,
        name: KAMILLA_ACCOUNT.name,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, kamillaUserId));

    await pool.query('delete from user_roles where user_id = $1 and role <> $2', [kamillaUserId, KAMILLA_ACCOUNT.role]);
    await pool.query(
      `insert into user_roles (user_id, role)
       values ($1, $2)
       on conflict do nothing`,
      [kamillaUserId, KAMILLA_ACCOUNT.role],
    );

    // Reset chat data because all previous rooms point to users we are removing.
    await pool.query('delete from chat_rooms');

    // Reassign user-linked domain data to Kamilla so foreign keys stay valid.
    await pool.query('update tickets set requester_id = $1 where requester_id <> $1', [kamillaUserId]);
    await pool.query('update tickets set assignee_id = $1 where assignee_id is not null and assignee_id <> $1', [kamillaUserId]);
    await pool.query('update ticket_comments set author_id = $1 where author_id <> $1', [kamillaUserId]);
    await pool.query('update ticket_history set actor_id = $1 where actor_id <> $1', [kamillaUserId]);
    await pool.query('update ticket_attachments set uploaded_by = $1 where uploaded_by <> $1', [kamillaUserId]);
    await pool.query('update ppr_plans set created_by = $1 where created_by <> $1', [kamillaUserId]);
    await pool.query('update ppr_plans set assigned_to = $1 where assigned_to is not null and assigned_to <> $1', [kamillaUserId]);
    await pool.query('update ppr_plans set signed_by_executor = $1 where signed_by_executor is not null and signed_by_executor <> $1', [kamillaUserId]);
    await pool.query('update ppr_plans set signed_by_manager = $1 where signed_by_manager is not null and signed_by_manager <> $1', [kamillaUserId]);
    await pool.query('update notifications set to_user_id = $1 where to_user_id <> $1', [kamillaUserId]);
    await pool.query('update performance_scores set user_id = $1 where user_id <> $1', [kamillaUserId]);
    await pool.query('update reports set author_id = $1 where author_id <> $1', [kamillaUserId]);
    await pool.query('update shared_documents set sender_id = $1 where sender_id <> $1', [kamillaUserId]);
    await pool.query('update shared_documents set recipient_id = $1 where recipient_id <> $1', [kamillaUserId]);
    await pool.query('update kb_articles set author_id = $1 where author_id <> $1', [kamillaUserId]);
    await pool.query('update ticket_kb_links set linked_by = $1 where linked_by <> $1', [kamillaUserId]);
    await pool.query('update assets set assigned_to = $1 where assigned_to is not null and assigned_to <> $1', [kamillaUserId]);

    await pool.query('delete from users where id <> $1', [kamillaUserId]);
    await pool.query('commit');

    console.log(`Done. Remaining user: ${KAMILLA_ACCOUNT.email} / ${KAMILLA_ACCOUNT.password}`);
  } catch (error) {
    await pool.query('rollback');
    throw error;
  }
}

keepOnlyKamilla()
  .catch((error) => {
    console.error('Failed to normalize Kamilla account:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
