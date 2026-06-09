import { db } from './index.js';
import { departments } from './schema.js';
import { isNull, eq } from 'drizzle-orm';

const NAME_MAP: Record<string, string> = {
  'IT бөлімі': 'IT Department',
  'HR бөлімі': 'HR Department',
  'Қаржы бөлімі': 'Finance Department',
  'ТТО': 'TTO',
};

export async function migrateDeptNames() {
  const rows = await db.select().from(departments).where(isNull(departments.nameEn));
  for (const dept of rows) {
    const nameEn = NAME_MAP[dept.name];
    if (nameEn) {
      await db.update(departments).set({ nameEn }).where(eq(departments.id, dept.id));
    }
  }
}
