import { inArray } from 'drizzle-orm';
import { db, pool } from './index.js';
import { assets, departments } from './schema.js';

const cartridgeAssets = [
  {
    name: 'HP 59A Black Toner Cartridge',
    assetType: 'peripheral' as const,
    status: 'in_stock' as const,
    serialNumber: 'CF259A-001',
    inventoryNumber: 'INV-CAR-001',
    manufacturer: 'HP',
    model: 'CF259A / 59A',
    location: 'Қойма',
    purchaseDate: '2026-04-01',
    purchaseCost: '42000',
    notes: 'HP LaserJet Pro M404dn үшін қара тонер',
  },
  {
    name: 'HP 59X High Yield Toner Cartridge',
    assetType: 'peripheral' as const,
    status: 'in_stock' as const,
    serialNumber: 'CF259X-002',
    inventoryNumber: 'INV-CAR-002',
    manufacturer: 'HP',
    model: 'CF259X / 59X',
    location: 'Қойма',
    purchaseDate: '2026-04-01',
    purchaseCost: '69000',
    notes: 'Жоғары сыйымдылықты қара тонер',
  },
  {
    name: 'Brother TN-2420 Toner Cartridge',
    assetType: 'peripheral' as const,
    status: 'in_stock' as const,
    serialNumber: 'TN2420-003',
    inventoryNumber: 'INV-CAR-003',
    manufacturer: 'Brother',
    model: 'TN-2420',
    location: 'Қойма',
    purchaseDate: '2026-04-10',
    purchaseCost: '38000',
    notes: 'Brother MFC-L2750DW үшін тонер',
  },
  {
    name: 'Canon 057 Toner Cartridge',
    assetType: 'peripheral' as const,
    status: 'in_stock' as const,
    serialNumber: 'CRG057-004',
    inventoryNumber: 'INV-CAR-004',
    manufacturer: 'Canon',
    model: 'Cartridge 057',
    location: 'Қойма',
    purchaseDate: '2026-05-02',
    purchaseCost: '45000',
    notes: 'Резервтік принтерлерге арналған тонер',
  },
];

async function seedCartridges() {
  const [itDepartment] = await db.select().from(departments).limit(1);
  const inventoryNumbers = cartridgeAssets.map(asset => asset.inventoryNumber);
  const existingAssets = await db
    .select({ inventoryNumber: assets.inventoryNumber })
    .from(assets)
    .where(inArray(assets.inventoryNumber, inventoryNumbers));

  const existingInventoryNumbers = new Set(existingAssets.map(asset => asset.inventoryNumber));
  const missingAssets = cartridgeAssets
    .filter(asset => !existingInventoryNumbers.has(asset.inventoryNumber))
    .map(asset => ({
      ...asset,
      departmentId: itDepartment?.id,
    }));

  if (missingAssets.length === 0) {
    console.log('Cartridge assets already exist. Nothing to insert.');
    return;
  }

  await db.insert(assets).values(missingAssets);
  console.log(`Inserted ${missingAssets.length} cartridge assets.`);
}

seedCartridges()
  .catch((error) => {
    console.error('Failed to seed cartridge assets:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
