import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, pool } from './index.js';
import { departments, profiles, userRoles, users } from './schema.js';

const TEST_USER = {
  email: 'test.user@qazaq.gen',
  password: 'test123',
  name: 'Тестовый Пользователь',
  avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Test%20User&backgroundColor=3b82f6&textColor=ffffff',
};

async function createTestUser() {
  console.log('Creating test chat user...');

  const [existingUser] = await db.select().from(users).where(eq(users.email, TEST_USER.email)).limit(1);
  const [itDepartment] = await db.select().from(departments).limit(1);

  if (existingUser) {
    await db.update(profiles)
      .set({
        name: TEST_USER.name,
        avatarUrl: TEST_USER.avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, existingUser.id));

    console.log(`Test user already exists: ${TEST_USER.email} / ${TEST_USER.password}`);
    return;
  }

  const passwordHash = await bcrypt.hash(TEST_USER.password, 12);
  const [user] = await db.insert(users).values({
    email: TEST_USER.email,
    passwordHash,
  }).returning();

  await db.insert(profiles).values({
    userId: user.id,
    email: TEST_USER.email,
    name: TEST_USER.name,
    avatarUrl: TEST_USER.avatarUrl,
    departmentId: itDepartment?.id,
  });

  await db.insert(userRoles).values({
    userId: user.id,
    role: 'employee',
  });

  console.log(`Created test user: ${TEST_USER.email} / ${TEST_USER.password}`);
}

createTestUser()
  .catch((error) => {
    console.error('Failed to create test user:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
