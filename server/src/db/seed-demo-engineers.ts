import bcrypt from 'bcryptjs';
import { pool } from './index.js';

const DEMO_ENGINEERS = [
  {
    email: 'liya@qazaq.gen',
    password: 'liya123',
    name: 'Лия Жарылкасын',
    line: 'Инженер первой линии',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Liya%20Zharylkasyn&backgroundColor=60a5fa&textColor=ffffff',
  },
  {
    email: 'aisha@qazaq.gen',
    password: 'aisha123',
    name: 'Аиша Нурланова',
    line: 'Инженер второй линии',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Aisha%20Nurlanova&backgroundColor=34d399&textColor=ffffff',
  },
  {
    email: 'kamilla.engineer@qazaq.gen',
    password: 'kamilla123',
    name: 'Камилла Кайратқызы',
    line: 'Инженер третьей линии',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Kamilla%20Kairatkyzy&backgroundColor=f59e0b&textColor=ffffff',
  },
] as const;

type Engineer = typeof DEMO_ENGINEERS[number];

type TicketPlan = {
  owner: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'assigned' | 'in_progress' | 'resolved';
  response: number;
  resolve?: number;
  breached: boolean;
  reopened?: boolean;
};

const ticketPlans: TicketPlan[] = [
  { owner: 'liya@qazaq.gen', title: 'Сброс пароля сотруднику отдела продаж', priority: 'medium', status: 'resolved', response: 8, resolve: 70, breached: false },
  { owner: 'liya@qazaq.gen', title: 'Настройка доступа к принтеру', priority: 'low', status: 'resolved', response: 12, resolve: 95, breached: false },
  { owner: 'liya@qazaq.gen', title: 'Консультация по корпоративной почте', priority: 'medium', status: 'resolved', response: 15, resolve: 120, breached: false },
  { owner: 'liya@qazaq.gen', title: 'Первичная диагностика ноутбука', priority: 'high', status: 'in_progress', response: 10, breached: false },
  { owner: 'aisha@qazaq.gen', title: 'Восстановление доступа к сетевой папке', priority: 'high', status: 'resolved', response: 20, resolve: 210, breached: false },
  { owner: 'aisha@qazaq.gen', title: 'Ошибка интеграции 1С и почты', priority: 'medium', status: 'resolved', response: 28, resolve: 260, breached: false },
  { owner: 'aisha@qazaq.gen', title: 'Проверка прав в ERP', priority: 'medium', status: 'assigned', response: 35, breached: false },
  { owner: 'aisha@qazaq.gen', title: 'Замедление терминального сервера', priority: 'high', status: 'in_progress', response: 55, breached: true },
  { owner: 'kamilla.engineer@qazaq.gen', title: 'Разбор сетевого инцидента на участке', priority: 'critical', status: 'resolved', response: 35, resolve: 360, breached: false },
  { owner: 'kamilla.engineer@qazaq.gen', title: 'Эскалация сбоя VPN для удаленного отдела', priority: 'high', status: 'resolved', response: 42, resolve: 420, breached: false, reopened: true },
  { owner: 'kamilla.engineer@qazaq.gen', title: 'Анализ повторяющихся SLA-рисков', priority: 'medium', status: 'in_progress', response: 50, breached: false },
] as const satisfies TicketPlan[];

async function ensureDepartment() {
  const existing = await pool.query<{ id: string }>(
    "select id from departments where name in ('IT бөлімі', 'IT отдел') order by name = 'IT бөлімі' desc limit 1",
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const inserted = await pool.query<{ id: string }>(
    "insert into departments (name) values ('IT бөлімі') returning id",
  );
  return inserted.rows[0].id;
}

async function ensureGroup(name: string, departmentId: string) {
  const existing = await pool.query<{ id: string }>(
    'select id from groups where name = $1 limit 1',
    [name],
  );
  if (existing.rows[0]) {
    await pool.query('update groups set department_id = $1 where id = $2', [departmentId, existing.rows[0].id]);
    return existing.rows[0].id;
  }

  const inserted = await pool.query<{ id: string }>(
    'insert into groups (name, department_id) values ($1, $2) returning id',
    [name, departmentId],
  );
  return inserted.rows[0].id;
}

async function ensureCategory() {
  const existing = await pool.query<{ id: string }>(
    "select id from categories where name = 'Демо KPI сотрудников' limit 1",
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const inserted = await pool.query<{ id: string }>(
    "insert into categories (name, description) values ('Демо KPI сотрудников', 'Демонстрационные заявки для защиты дипломной работы') returning id",
  );
  return inserted.rows[0].id;
}

async function findAdminUserId() {
  const result = await pool.query<{ id: string }>(
    `select u.id
     from users u
     left join profiles p on p.user_id = u.id
     left join user_roles ur on ur.user_id = u.id
     where ur.role = 'admin'
     order by case when u.email = 'kamilla@qazaq.gen' then 0 else 1 end
     limit 1`,
  );

  if (!result.rows[0]) {
    throw new Error('Admin account is required before seeding demo engineer tickets.');
  }

  return result.rows[0].id;
}

async function ensureEngineer(engineer: Engineer, departmentId: string, groupId: string) {
  const passwordHash = await bcrypt.hash(engineer.password, 12);
  const existing = await pool.query<{ id: string }>('select id from users where email = $1 limit 1', [engineer.email]);

  let userId = existing.rows[0]?.id;
  if (userId) {
    await pool.query(
      'update users set password_hash = $1, totp_secret = null, totp_enabled = false where id = $2',
      [passwordHash, userId],
    );
  } else {
    const inserted = await pool.query<{ id: string }>(
      'insert into users (email, password_hash, totp_secret, totp_enabled) values ($1, $2, null, false) returning id',
      [engineer.email, passwordHash],
    );
    userId = inserted.rows[0].id;
  }

  await pool.query(
    `insert into profiles (user_id, email, name, avatar_url, department_id, group_id)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (user_id) do update
       set email = excluded.email,
           name = excluded.name,
           avatar_url = excluded.avatar_url,
           department_id = excluded.department_id,
           group_id = excluded.group_id,
           updated_at = now()`,
    [userId, engineer.email, engineer.name, engineer.avatarUrl, departmentId, groupId],
  );

  await pool.query('delete from user_roles where user_id = $1', [userId]);
  await pool.query('insert into user_roles (user_id, role) values ($1, $2)', [userId, 'agent']);

  return userId;
}

async function upsertDemoTicket(plan: TicketPlan, assigneeId: string, requesterId: string, categoryId: string, index: number) {
  const title = plan.title;
  const legacyTitle = `[DEMO-KPI] ${plan.title}`;
  const createdAt = new Date();
  createdAt.setDate(Math.max(1, createdAt.getDate() - (ticketPlans.length - index)));
  createdAt.setHours(9 + (index % 7), 10, 0, 0);

  const updatedAt = new Date(createdAt.getTime() + (plan.resolve ?? 180) * 60000);
  const closedAt = ['resolved', 'closed'].includes(plan.status) ? updatedAt : null;

  const existing = await pool.query<{ id: string }>(
    'select id from tickets where title = $1 or title = $2 limit 1',
    [title, legacyTitle],
  );
  let ticketId = existing.rows[0]?.id;

  if (ticketId) {
    await pool.query(
      `update tickets
       set description = $1,
           requester_id = $2,
           assignee_id = $3,
           category_id = $4,
           priority = $5,
           status = $6,
           reopened_count = $7,
           created_at = $8,
           updated_at = $9,
           closed_at = $10
       where id = $11`,
      [
        'Демонстрационная заявка для расчета KPI сотрудников.',
        requesterId,
        assigneeId,
        categoryId,
        plan.priority,
        plan.status,
        plan.reopened ? 1 : 0,
        createdAt,
        updatedAt,
        closedAt,
        ticketId,
      ],
    );
  } else {
    const inserted = await pool.query<{ id: string }>(
      `insert into tickets
        (title, description, requester_id, assignee_id, category_id, priority, status, reopened_count, created_at, updated_at, closed_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       returning id`,
      [
        title,
        'Демонстрационная заявка для расчета KPI сотрудников.',
        requesterId,
        assigneeId,
        categoryId,
        plan.priority,
        plan.status,
        plan.reopened ? 1 : 0,
        createdAt,
        updatedAt,
        closedAt,
      ],
    );
    ticketId = inserted.rows[0].id;
  }

  const respondedAt = new Date(createdAt.getTime() + plan.response * 60000);
  const responseDue = new Date(createdAt.getTime() + 60 * 60000);
  const resolveDue = new Date(createdAt.getTime() + 8 * 60 * 60000);

  await pool.query(
    `insert into ticket_sla (ticket_id, response_due, resolve_due, responded_at, breached_response, breached_resolve)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (ticket_id) do update
       set response_due = excluded.response_due,
           resolve_due = excluded.resolve_due,
           responded_at = excluded.responded_at,
           breached_response = excluded.breached_response,
           breached_resolve = excluded.breached_resolve`,
    [ticketId, responseDue, resolveDue, respondedAt, plan.breached, false],
  );

  await pool.query('delete from ticket_history where ticket_id = $1', [ticketId]);

  await pool.query(
    'insert into ticket_history (ticket_id, actor_id, field, old_value, new_value, created_at) values ($1, $2, $3, $4, $5, $6)',
    [ticketId, assigneeId, 'status', 'new', plan.status === 'resolved' ? 'assigned' : plan.status, respondedAt],
  );

  if (plan.reopened) {
    await pool.query(
      'insert into ticket_history (ticket_id, actor_id, field, old_value, new_value, created_at) values ($1, $2, $3, $4, $5, $6)',
      [ticketId, assigneeId, 'status', 'resolved', 'reopened', new Date(updatedAt.getTime() - 30 * 60000)],
    );
  }

  if (plan.status === 'resolved') {
    await pool.query(
      'insert into ticket_history (ticket_id, actor_id, field, old_value, new_value, created_at) values ($1, $2, $3, $4, $5, $6)',
      [ticketId, assigneeId, 'status', plan.reopened ? 'reopened' : 'in_progress', 'resolved', updatedAt],
    );
  }
}

async function seedDemoEngineers() {
  console.log('Seeding demo engineer team...');

  await pool.query('begin');
  try {
    const departmentId = await ensureDepartment();
    const categoryId = await ensureCategory();
    const adminUserId = await findAdminUserId();
    const engineerIds = new Map<string, string>();

    for (const engineer of DEMO_ENGINEERS) {
      const groupId = await ensureGroup(engineer.line, departmentId);
      const userId = await ensureEngineer(engineer, departmentId, groupId);
      engineerIds.set(engineer.email, userId);
    }

    for (const [index, plan] of ticketPlans.entries()) {
      const assigneeId = engineerIds.get(plan.owner);
      if (!assigneeId) throw new Error(`Missing engineer for ${plan.owner}`);
      await upsertDemoTicket(plan, assigneeId, adminUserId, categoryId, index);
    }

    await pool.query('commit');

    console.log('Done. Demo engineers:');
    for (const engineer of DEMO_ENGINEERS) {
      console.log(`${engineer.name} / ${engineer.line}: ${engineer.email} / ${engineer.password} / agent`);
    }
  } catch (error) {
    await pool.query('rollback');
    throw error;
  }
}

seedDemoEngineers()
  .catch((error) => {
    console.error('Failed to seed demo engineers:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
