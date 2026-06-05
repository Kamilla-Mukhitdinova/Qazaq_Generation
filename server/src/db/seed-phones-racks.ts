import { inArray } from 'drizzle-orm';
import { db, pool } from './index.js';
import { assets, departments } from './schema.js';

const phonesAndRacks = [
  {
    name: 'Yealink SIP-T31P IP Phone',
    assetType: 'peripheral' as const,
    status: 'active' as const,
    serialNumber: 'YL-T31P-001',
    inventoryNumber: 'INV-PHN-001',
    manufacturer: 'Yealink',
    model: 'SIP-T31P',
    location: 'Офис 101',
    purchaseDate: '2026-03-12',
    purchaseCost: '32000',
    notes: 'Қабылдау бөлмесі үшін IP телефон',
  },
  {
    name: 'Cisco IP Phone 7841',
    assetType: 'peripheral' as const,
    status: 'active' as const,
    serialNumber: 'CS-7841-002',
    inventoryNumber: 'INV-PHN-002',
    manufacturer: 'Cisco',
    model: 'IP Phone 7841',
    location: 'Офис 205',
    purchaseDate: '2026-03-18',
    purchaseCost: '52000',
    notes: 'Байланыс орталығы операторы үшін телефон',
  },
  {
    name: 'Polycom SoundStation IP 6000',
    assetType: 'peripheral' as const,
    status: 'in_stock' as const,
    serialNumber: 'POLY-6000-003',
    inventoryNumber: 'INV-PHN-003',
    manufacturer: 'Polycom',
    model: 'SoundStation IP 6000',
    location: 'Қойма',
    purchaseDate: '2026-04-04',
    purchaseCost: '155000',
    notes: 'Келіссөз бөлмесіне арналған конференц-телефон',
  },
  {
    name: 'APC NetShelter SX 42U Rack',
    assetType: 'hardware' as const,
    status: 'active' as const,
    serialNumber: 'APC-42U-001',
    inventoryNumber: 'INV-RCK-001',
    manufacturer: 'APC',
    model: 'NetShelter SX 42U',
    location: 'Серверлік бөлме',
    purchaseDate: '2025-11-20',
    purchaseCost: '480000',
    notes: 'Серверлік бөлмедегі негізгі 42U стойка',
  },
  {
    name: 'Toten 12U Wall Mount Rack',
    assetType: 'hardware' as const,
    status: 'active' as const,
    serialNumber: 'TOT-12U-002',
    inventoryNumber: 'INV-RCK-002',
    manufacturer: 'Toten',
    model: '12U Wall Mount',
    location: 'Офис 102',
    purchaseDate: '2026-02-14',
    purchaseCost: '145000',
    notes: 'Желілік жабдыққа арналған қабырға стойкасы',
  },
  {
    name: 'Hyperline 24U Rack Cabinet',
    assetType: 'hardware' as const,
    status: 'in_stock' as const,
    serialNumber: 'HYP-24U-003',
    inventoryNumber: 'INV-RCK-003',
    manufacturer: 'Hyperline',
    model: '24U Rack Cabinet',
    location: 'Қойма',
    purchaseDate: '2026-05-06',
    purchaseCost: '260000',
    notes: 'Резервтік жабдыққа арналған стойка',
  },
];

async function seedPhonesAndRacks() {
  const [itDepartment] = await db.select().from(departments).limit(1);
  const inventoryNumbers = phonesAndRacks.map(asset => asset.inventoryNumber);
  const existingAssets = await db
    .select({ inventoryNumber: assets.inventoryNumber })
    .from(assets)
    .where(inArray(assets.inventoryNumber, inventoryNumbers));

  const existingInventoryNumbers = new Set(existingAssets.map(asset => asset.inventoryNumber));
  const missingAssets = phonesAndRacks
    .filter(asset => !existingInventoryNumbers.has(asset.inventoryNumber))
    .map(asset => ({
      ...asset,
      departmentId: itDepartment?.id,
    }));

  if (missingAssets.length === 0) {
    console.log('Phone and rack assets already exist. Nothing to insert.');
    return;
  }

  await db.insert(assets).values(missingAssets);
  console.log(`Inserted ${missingAssets.length} phone/rack assets.`);
}

seedPhonesAndRacks()
  .catch((error) => {
    console.error('Failed to seed phone/rack assets:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
