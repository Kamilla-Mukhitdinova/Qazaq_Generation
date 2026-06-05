import { inArray } from 'drizzle-orm';
import { db, pool } from './index.js';
import { assets, departments } from './schema.js';

const sectionAssets = [
  { name: 'Honeywell Voyager 1472g Scanner', assetType: 'peripheral' as const, status: 'active' as const, serialNumber: 'HW-1472-001', inventoryNumber: 'INV-DEV-001', manufacturer: 'Honeywell', model: 'Voyager 1472g', location: 'Қойма', purchaseDate: '2026-02-03', purchaseCost: '118000', notes: 'Қоймадағы сканерлеу құрылғысы' },
  { name: 'Samsung Galaxy Tab Active4 Pro', assetType: 'peripheral' as const, status: 'active' as const, serialNumber: 'SG-TAB-002', inventoryNumber: 'INV-DEV-002', manufacturer: 'Samsung', model: 'Galaxy Tab Active4 Pro', location: 'Офис 101', purchaseDate: '2026-03-09', purchaseCost: '310000', notes: 'Мобильді тексеріс планшеті' },
  { name: 'ZKTeco KR601 Badge Reader', assetType: 'peripheral' as const, status: 'in_stock' as const, serialNumber: 'ZK-KR601-003', inventoryNumber: 'INV-DEV-003', manufacturer: 'ZKTeco', model: 'KR601', location: 'Қойма', purchaseDate: '2026-05-11', purchaseCost: '24000', notes: 'Қызметкерлер бейдждерін оқу құрылғысы' },

  { name: 'A4 Office Paper Box 80gsm', assetType: 'peripheral' as const, status: 'in_stock' as const, serialNumber: 'A4-BOX-001', inventoryNumber: 'INV-CNS-001', manufacturer: 'SvetoCopy', model: 'A4 80gsm', location: 'Қойма', purchaseDate: '2026-05-15', purchaseCost: '18500', notes: 'Принтерлерге арналған A4 қағазы' },
  { name: 'AF Screen-Clene Wipes Pack', assetType: 'peripheral' as const, status: 'in_stock' as const, serialNumber: 'AF-WIPES-002', inventoryNumber: 'INV-CNS-002', manufacturer: 'AF', model: 'Screen-Clene', location: 'Қойма', purchaseDate: '2026-05-16', purchaseCost: '9500', notes: 'Жабдықтарды тазалауға арналған майлықтар' },
  { name: 'Duracell AA Battery Pack', assetType: 'peripheral' as const, status: 'in_stock' as const, serialNumber: 'DUR-AA-003', inventoryNumber: 'INV-CNS-003', manufacturer: 'Duracell', model: 'AA Alkaline', location: 'Қойма', purchaseDate: '2026-05-20', purchaseCost: '7200', notes: 'Пернетақта мен тышқанға арналған батареялар' },

  { name: 'DeepCool Matrexx 55 Case', assetType: 'hardware' as const, status: 'in_stock' as const, serialNumber: 'DC-M55-001', inventoryNumber: 'INV-CSE-001', manufacturer: 'DeepCool', model: 'Matrexx 55', location: 'Қойма', purchaseDate: '2026-04-19', purchaseCost: '39000', notes: 'Жаңа жұмыс станциясын жинауға арналған корпус' },
  { name: 'Supermicro CSE-825 Server Chassis', assetType: 'hardware' as const, status: 'active' as const, serialNumber: 'SM-CSE825-002', inventoryNumber: 'INV-CSE-002', manufacturer: 'Supermicro', model: 'CSE-825', location: 'Серверлік бөлме', purchaseDate: '2025-12-08', purchaseCost: '360000', notes: 'Серверлік жабдыққа арналған корпус' },

  { name: 'APC Basic Rack PDU AP7553', assetType: 'hardware' as const, status: 'active' as const, serialNumber: 'AP7553-001', inventoryNumber: 'INV-PDU-001', manufacturer: 'APC', model: 'AP7553', location: 'Офис 102', purchaseDate: '2026-01-22', purchaseCost: '78000', notes: 'Кеңсе стойкасына арналған PDU' },
  { name: 'APC Metered Rack PDU AP8853', assetType: 'hardware' as const, status: 'active' as const, serialNumber: 'AP8853-002', inventoryNumber: 'INV-PDU-002', manufacturer: 'APC', model: 'AP8853', location: 'Серверлік бөлме', purchaseDate: '2026-01-25', purchaseCost: '210000', notes: 'Серверлік стойка үшін бақыланатын PDU' },

  { name: 'Legrand Cat6 Patch Panel 24 Port', assetType: 'network' as const, status: 'active' as const, serialNumber: 'LG-PP24-001', inventoryNumber: 'INV-PAS-001', manufacturer: 'Legrand', model: 'Cat6 24 Port Patch Panel', location: 'Серверлік бөлме', purchaseDate: '2025-10-10', purchaseCost: '46000', notes: 'Коммутациялық панель' },
  { name: 'Schneider Keystone Cat6 Module Set', assetType: 'network' as const, status: 'in_stock' as const, serialNumber: 'SCH-KS-002', inventoryNumber: 'INV-PAS-002', manufacturer: 'Schneider', model: 'Cat6 Keystone', location: 'Қойма', purchaseDate: '2026-04-18', purchaseCost: '22000', notes: 'Желі розеткаларына арналған Keystone модульдері' },

  { name: 'Epson EB-W51 Unmanaged Projector', assetType: 'peripheral' as const, status: 'active' as const, serialNumber: 'EPS-W51-001', inventoryNumber: 'INV-UNA-001', manufacturer: 'Epson', model: 'EB-W51', location: 'Офис 205', purchaseDate: '2024-09-17', purchaseCost: '285000', notes: 'Уақытша жобаға берілген проектор' },
  { name: 'Samsung Flip Demo Display', assetType: 'peripheral' as const, status: 'in_stock' as const, serialNumber: 'SM-FLIP-002', inventoryNumber: 'INV-UNA-002', manufacturer: 'Samsung', model: 'Flip WM55R', location: 'Қойма', purchaseDate: '2025-02-21', purchaseCost: '520000', notes: 'Есепке алынбаған демонстрациялық экран' },

  { name: 'Cat6 Patch Cable Set 2m', assetType: 'peripheral' as const, status: 'in_stock' as const, serialNumber: 'CAT6-2M-001', inventoryNumber: 'INV-CBL-001', manufacturer: 'Hyperline', model: 'Cat6 UTP 2m', location: 'Қойма', purchaseDate: '2026-05-12', purchaseCost: '18000', notes: 'Cat6 патч-кордтар жинағы' },
  { name: 'HDMI Cable Set 5m', assetType: 'peripheral' as const, status: 'in_stock' as const, serialNumber: 'HDMI-5M-002', inventoryNumber: 'INV-CBL-002', manufacturer: 'Ugreen', model: 'HDMI 2.0 5m', location: 'Қойма', purchaseDate: '2026-05-12', purchaseCost: '26000', notes: 'Келіссөз бөлмесіне арналған HDMI кабельдер' },

  { name: 'Kcell Corporate SIM Backup', assetType: 'peripheral' as const, status: 'in_stock' as const, serialNumber: 'SIM-KC-001', inventoryNumber: 'INV-SIM-001', manufacturer: 'Kcell', model: 'Corporate SIM', location: 'Қойма', purchaseDate: '2026-01-10', purchaseCost: '0', notes: 'Резервтік корпоративтік SIM-карта' },
  { name: 'Tele2 IoT SIM Card', assetType: 'peripheral' as const, status: 'active' as const, serialNumber: 'SIM-T2-002', inventoryNumber: 'INV-SIM-002', manufacturer: 'Tele2', model: 'IoT SIM', location: 'Серверлік бөлме', purchaseDate: '2026-02-05', purchaseCost: '0', notes: 'IoT модеміне арналған SIM-карта' },

  { name: 'Fortinet FortiClient VPN Licenses', assetType: 'license' as const, status: 'active' as const, serialNumber: 'FORTI-VPN-001', inventoryNumber: 'INV-VPN-001', manufacturer: 'Fortinet', model: 'FortiClient VPN', location: 'Серверлік бөлме', purchaseDate: '2026-01-01', warrantyExpiry: '2027-01-01', purchaseCost: '340000', notes: 'Қашықтағы қызметкерлерге арналған VPN лицензиялары' },
  { name: 'YubiKey 5 NFC VPN Token Set', assetType: 'peripheral' as const, status: 'in_stock' as const, serialNumber: 'YUBI-5NFC-002', inventoryNumber: 'INV-VPN-002', manufacturer: 'Yubico', model: 'YubiKey 5 NFC', location: 'Қойма', purchaseDate: '2026-03-02', purchaseCost: '210000', notes: 'Аппараттық VPN токендері' },

  { name: 'Power BI ITSM Performance Report', assetType: 'software' as const, status: 'active' as const, serialNumber: 'PBI-ITSM-001', inventoryNumber: 'INV-RPT-001', manufacturer: 'Microsoft', model: 'Power BI', location: 'Cloud', purchaseDate: '2026-01-15', purchaseCost: '0', notes: 'ITSM өнімділігі бойынша Power BI есебі' },
  { name: 'Grafana Infrastructure Dashboard', assetType: 'software' as const, status: 'active' as const, serialNumber: 'GRAF-INFRA-002', inventoryNumber: 'INV-RPT-002', manufacturer: 'Grafana Labs', model: 'Grafana Dashboard', location: 'Cloud', purchaseDate: '2026-02-20', purchaseCost: '0', notes: 'Инфрақұрылым мониторингіне арналған dashboard' },
];

async function seedAllAssetSections() {
  const [itDepartment] = await db.select().from(departments).limit(1);
  const inventoryNumbers = sectionAssets.map(asset => asset.inventoryNumber);
  const existingAssets = await db
    .select({ inventoryNumber: assets.inventoryNumber })
    .from(assets)
    .where(inArray(assets.inventoryNumber, inventoryNumbers));

  const existingInventoryNumbers = new Set(existingAssets.map(asset => asset.inventoryNumber));
  const missingAssets = sectionAssets
    .filter(asset => !existingInventoryNumbers.has(asset.inventoryNumber))
    .map(asset => ({
      ...asset,
      departmentId: itDepartment?.id,
    }));

  if (missingAssets.length === 0) {
    console.log('All additional asset section records already exist. Nothing to insert.');
    return;
  }

  await db.insert(assets).values(missingAssets);
  console.log(`Inserted ${missingAssets.length} additional asset section records.`);
}

seedAllAssetSections()
  .catch((error) => {
    console.error('Failed to seed all asset sections:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
