import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, pool } from './index.js';
import { departments, profiles, userRoles, users } from './schema.js';

const LIYA_ACCOUNT = {
  email: 'liya@qazaq.gen',
  password: 'liya123',
  name: 'Лия Жарылкасын',
  role: 'employee' as const,
  avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Liya%20Zharylkasyn&backgroundColor=60a5fa&textColor=ffffff',
};

async function createLiyaUser() {
  console.log('Creating Liya employee account...');

  const [existingUser] = await db.select().from(users).where(eq(users.email, LIYA_ACCOUNT.email)).limit(1);
  const [department] = await db.select().from(departments).limit(1);
  const passwordHash = await bcrypt.hash(LIYA_ACCOUNT.password, 12);

  if (existingUser) {
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, existingUser.id));

    await db.update(profiles)
      .set({
        email: LIYA_ACCOUNT.email,
        name: LIYA_ACCOUNT.name,
        avatarUrl: LIYA_ACCOUNT.avatarUrl,
        departmentId: department?.id,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, existingUser.id));

    await pool.query('delete from user_roles where user_id = $1 and role <> $2', [existingUser.id, LIYA_ACCOUNT.role]);
    await pool.query(
      `insert into user_roles (user_id, role)
       values ($1, $2)
       on conflict do nothing`,
      [existingUser.id, LIYA_ACCOUNT.role],
    );

    console.log(`Liya already exists. Login: ${LIYA_ACCOUNT.email} / ${LIYA_ACCOUNT.password}`);
    return;
  }

  const [user] = await db.insert(users).values({
    email: LIYA_ACCOUNT.email,
    passwordHash,
  }).returning();

  await db.insert(profiles).values({
    userId: user.id,
    email: LIYA_ACCOUNT.email,
    name: LIYA_ACCOUNT.name,
    avatarUrl: LIYA_ACCOUNT.avatarUrl,
    departmentId: department?.id,
  });

  await db.insert(userRoles).values({
    userId: user.id,
    role: LIYA_ACCOUNT.role,
  });

  console.log(`Created Liya. Login: ${LIYA_ACCOUNT.email} / ${LIYA_ACCOUNT.password}`);
}

createLiyaUser()
  .catch((error) => {
    console.error('Failed to create Liya:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
