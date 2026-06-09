import bcrypt from 'bcryptjs';
import { db, pool } from './index.js';
import { users, profiles, userRoles, departments, categories, assets, kbCategories, kbArticles, tickets, ticketComments, ticketHistory, ticketSla } from './schema.js';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create departments
  const [itDept] = await db.insert(departments).values({ name: 'IT бөлімі', nameEn: 'IT Department' }).returning();
  const [hrDept] = await db.insert(departments).values({ name: 'HR бөлімі', nameEn: 'HR Department' }).returning();
  const [finDept] = await db.insert(departments).values({ name: 'Қаржы бөлімі', nameEn: 'Finance Department' }).returning();

  // Create categories
  const [catSupport] = await db.insert(categories).values({ name: 'Техникалық қолдау', description: 'Техникалық мәселелер' }).returning();
  const [catNetwork] = await db.insert(categories).values({ name: 'Желі', description: 'Желілік мәселелер' }).returning();
  const [catSoftware] = await db.insert(categories).values({ name: 'Бағдарламалық қамтамасыз ету', description: 'БҚ орнату және жаңарту' }).returning();
  const [catHardware] = await db.insert(categories).values({ name: 'Аппараттық құралдар', description: 'Құрылғылар мен жабдықтар' }).returning();

  // Create admin user
  const adminHash = await bcrypt.hash('admin123', 12);
  const [adminUser] = await db.insert(users).values({
    email: 'admin@qazaq.gen',
    passwordHash: adminHash,
  }).returning();

  await db.insert(profiles).values({
    userId: adminUser.id,
    email: 'admin@qazaq.gen',
    name: 'Админ',
    departmentId: itDept.id,
  });

  await db.insert(userRoles).values({
    userId: adminUser.id,
    role: 'admin',
  });

  // Create agent user
  const agentHash = await bcrypt.hash('agent123', 12);
  const [agentUser] = await db.insert(users).values({
    email: 'agent@qazaq.gen',
    passwordHash: agentHash,
  }).returning();

  await db.insert(profiles).values({
    userId: agentUser.id,
    email: 'agent@qazaq.gen',
    name: 'Агент Тестов',
    departmentId: itDept.id,
  });

  await db.insert(userRoles).values({
    userId: agentUser.id,
    role: 'agent',
  });

  // ═══════════════════════════════════════════
  //  ASSETS - тестовое оборудование и ПО
  // ═══════════════════════════════════════════
  console.log('📦 Seeding assets...');

  await db.insert(assets).values([
    // --- Hardware ---
    {
      name: 'Dell OptiPlex 7090',
      assetType: 'hardware',
      status: 'active',
      serialNumber: 'DL-7090-001',
      inventoryNumber: 'INV-HW-001',
      manufacturer: 'Dell',
      model: 'OptiPlex 7090',
      location: 'Офис 101, 1 этаж',
      assignedTo: adminUser.id,
      departmentId: itDept.id,
      purchaseDate: '2026-01-15',
      warrantyExpiry: '2027-01-15',
      purchaseCost: '450000',
      notes: 'Жұмыс компьютері - IT бөлімі',
    },
    {
      name: 'HP ProBook 450 G10',
      assetType: 'hardware',
      status: 'active',
      serialNumber: 'HP-450G10-002',
      inventoryNumber: 'INV-HW-002',
      manufacturer: 'HP',
      model: 'ProBook 450 G10',
      location: 'Офис 205, 2 этаж',
      assignedTo: agentUser.id,
      departmentId: itDept.id,
      purchaseDate: '2026-03-20',
      warrantyExpiry: '2027-03-20',
      purchaseCost: '520000',
      notes: 'Ноутбук агента',
    },
    {
      name: 'Lenovo ThinkPad X1 Carbon',
      assetType: 'hardware',
      status: 'in_stock',
      serialNumber: 'LN-X1C-003',
      inventoryNumber: 'INV-HW-003',
      manufacturer: 'Lenovo',
      model: 'ThinkPad X1 Carbon Gen 11',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-06-10',
      warrantyExpiry: '2027-06-10',
      purchaseCost: '780000',
      notes: 'Резервтік ноутбук',
    },
    {
      name: 'HP LaserJet Pro M404dn',
      assetType: 'hardware',
      status: 'active',
      serialNumber: 'HP-LJ-004',
      inventoryNumber: 'INV-HW-004',
      manufacturer: 'HP',
      model: 'LaserJet Pro M404dn',
      location: 'Офис 102, 1 этаж',
      departmentId: hrDept.id,
      purchaseDate: '2023-09-01',
      warrantyExpiry: '2025-09-01',
      purchaseCost: '120000',
      notes: 'Принтер HR бөлімі',
    },
    {
      name: 'Samsung Monitor 27" 4K',
      assetType: 'hardware',
      status: 'active',
      serialNumber: 'SM-27-005',
      inventoryNumber: 'INV-HW-005',
      manufacturer: 'Samsung',
      model: 'S27A800NMI',
      location: 'Офис 101, 1 этаж',
      assignedTo: adminUser.id,
      departmentId: itDept.id,
      purchaseDate: '2026-02-01',
      warrantyExpiry: '2027-02-01',
      purchaseCost: '195000',
    },
    {
      name: 'Cisco Catalyst 2960',
      assetType: 'network',
      status: 'active',
      serialNumber: 'CISCO-2960-006',
      inventoryNumber: 'INV-NW-001',
      manufacturer: 'Cisco',
      model: 'Catalyst 2960-X 24-Port',
      location: 'Серверлік бөлме',
      departmentId: itDept.id,
      purchaseDate: '2023-06-15',
      warrantyExpiry: '2026-06-15',
      purchaseCost: '850000',
      notes: 'Негізгі коммутатор',
    },
    {
      name: 'APC Smart-UPS 1500VA',
      assetType: 'hardware',
      status: 'active',
      serialNumber: 'APC-1500-007',
      inventoryNumber: 'INV-HW-006',
      manufacturer: 'APC',
      model: 'Smart-UPS 1500VA',
      location: 'Серверлік бөлме',
      departmentId: itDept.id,
      purchaseDate: '2023-08-20',
      warrantyExpiry: '2026-08-20',
      purchaseCost: '280000',
      notes: 'ИБП серверлік бөлме',
    },
    {
      name: 'Dell PowerEdge R740',
      assetType: 'hardware',
      status: 'active',
      serialNumber: 'DL-R740-008',
      inventoryNumber: 'INV-HW-007',
      manufacturer: 'Dell',
      model: 'PowerEdge R740',
      location: 'Серверлік бөлме',
      departmentId: itDept.id,
      purchaseDate: '2022-12-01',
      warrantyExpiry: '2025-12-01',
      purchaseCost: '3200000',
      notes: 'Негізгі сервер',
    },
    // Retired
    {
      name: 'HP EliteDesk 800 G3',
      assetType: 'hardware',
      status: 'retired',
      serialNumber: 'HP-800G3-009',
      inventoryNumber: 'INV-HW-008',
      manufacturer: 'HP',
      model: 'EliteDesk 800 G3',
      location: 'Қойма',
      departmentId: finDept.id,
      purchaseDate: '2019-03-01',
      warrantyExpiry: '2022-03-01',
      purchaseCost: '320000',
      notes: 'Ескірген, пайдаланудан шығарылды',
    },
    // --- Peripherals ---
    {
      name: 'Logitech MX Keys + MX Master 3S',
      assetType: 'peripheral',
      status: 'active',
      serialNumber: 'LG-MX-010',
      inventoryNumber: 'INV-PR-001',
      manufacturer: 'Logitech',
      model: 'MX Keys + MX Master 3S',
      location: 'Офис 101',
      assignedTo: adminUser.id,
      departmentId: itDept.id,
      purchaseDate: '2026-04-15',
      purchaseCost: '85000',
    },
    // --- Cartridges ---
    {
      name: 'HP 59A Black Toner Cartridge',
      assetType: 'peripheral',
      status: 'in_stock',
      serialNumber: 'CF259A-001',
      inventoryNumber: 'INV-CAR-001',
      manufacturer: 'HP',
      model: 'CF259A / 59A',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-04-01',
      purchaseCost: '42000',
      notes: 'HP LaserJet Pro M404dn үшін қара тонер',
    },
    {
      name: 'HP 59X High Yield Toner Cartridge',
      assetType: 'peripheral',
      status: 'in_stock',
      serialNumber: 'CF259X-002',
      inventoryNumber: 'INV-CAR-002',
      manufacturer: 'HP',
      model: 'CF259X / 59X',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-04-01',
      purchaseCost: '69000',
      notes: 'Жоғары сыйымдылықты қара тонер',
    },
    {
      name: 'Brother TN-2420 Toner Cartridge',
      assetType: 'peripheral',
      status: 'in_stock',
      serialNumber: 'TN2420-003',
      inventoryNumber: 'INV-CAR-003',
      manufacturer: 'Brother',
      model: 'TN-2420',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-04-10',
      purchaseCost: '38000',
      notes: 'Brother MFC-L2750DW үшін тонер',
    },
    {
      name: 'Canon 057 Toner Cartridge',
      assetType: 'peripheral',
      status: 'in_stock',
      serialNumber: 'CRG057-004',
      inventoryNumber: 'INV-CAR-004',
      manufacturer: 'Canon',
      model: 'Cartridge 057',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-05-02',
      purchaseCost: '45000',
      notes: 'Резервтік принтерлерге арналған тонер',
    },
    // --- Phones ---
    {
      name: 'Yealink SIP-T31P IP Phone',
      assetType: 'peripheral',
      status: 'active',
      serialNumber: 'YL-T31P-001',
      inventoryNumber: 'INV-PHN-001',
      manufacturer: 'Yealink',
      model: 'SIP-T31P',
      location: 'Офис 101',
      departmentId: itDept.id,
      purchaseDate: '2026-03-12',
      purchaseCost: '32000',
      notes: 'Қабылдау бөлмесі үшін IP телефон',
    },
    {
      name: 'Cisco IP Phone 7841',
      assetType: 'peripheral',
      status: 'active',
      serialNumber: 'CS-7841-002',
      inventoryNumber: 'INV-PHN-002',
      manufacturer: 'Cisco',
      model: 'IP Phone 7841',
      location: 'Офис 205',
      departmentId: itDept.id,
      purchaseDate: '2026-03-18',
      purchaseCost: '52000',
      notes: 'Байланыс орталығы операторы үшін телефон',
    },
    {
      name: 'Polycom SoundStation IP 6000',
      assetType: 'peripheral',
      status: 'in_stock',
      serialNumber: 'POLY-6000-003',
      inventoryNumber: 'INV-PHN-003',
      manufacturer: 'Polycom',
      model: 'SoundStation IP 6000',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-04-04',
      purchaseCost: '155000',
      notes: 'Келіссөз бөлмесіне арналған конференц-телефон',
    },
    // --- Racks ---
    {
      name: 'APC NetShelter SX 42U Rack',
      assetType: 'hardware',
      status: 'active',
      serialNumber: 'APC-42U-001',
      inventoryNumber: 'INV-RCK-001',
      manufacturer: 'APC',
      model: 'NetShelter SX 42U',
      location: 'Серверлік бөлме',
      departmentId: itDept.id,
      purchaseDate: '2025-11-20',
      purchaseCost: '480000',
      notes: 'Серверлік бөлмедегі негізгі 42U стойка',
    },
    {
      name: 'Toten 12U Wall Mount Rack',
      assetType: 'hardware',
      status: 'active',
      serialNumber: 'TOT-12U-002',
      inventoryNumber: 'INV-RCK-002',
      manufacturer: 'Toten',
      model: '12U Wall Mount',
      location: 'Офис 102',
      departmentId: itDept.id,
      purchaseDate: '2026-02-14',
      purchaseCost: '145000',
      notes: 'Желілік жабдыққа арналған қабырға стойкасы',
    },
    {
      name: 'Hyperline 24U Rack Cabinet',
      assetType: 'hardware',
      status: 'in_stock',
      serialNumber: 'HYP-24U-003',
      inventoryNumber: 'INV-RCK-003',
      manufacturer: 'Hyperline',
      model: '24U Rack Cabinet',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-05-06',
      purchaseCost: '260000',
      notes: 'Резервтік жабдыққа арналған стойка',
    },
    // --- Software ---
    {
      name: 'Microsoft Office 365 Business',
      assetType: 'software',
      status: 'active',
      inventoryNumber: 'INV-SW-001',
      manufacturer: 'Microsoft',
      model: 'Office 365 Business Premium',
      departmentId: itDept.id,
      purchaseDate: '2026-01-01',
      warrantyExpiry: '2025-01-01',
      purchaseCost: '180000',
      notes: '50 лицензия, жылдық жазылым',
    },
    {
      name: 'Kaspersky Endpoint Security',
      assetType: 'software',
      status: 'active',
      inventoryNumber: 'INV-SW-002',
      manufacturer: 'Kaspersky',
      model: 'Endpoint Security Cloud Plus',
      departmentId: itDept.id,
      purchaseDate: '2026-02-01',
      warrantyExpiry: '2025-02-01',
      purchaseCost: '95000',
      notes: '50 лицензия',
    },
    {
      name: 'Adobe Creative Cloud',
      assetType: 'software',
      status: 'active',
      inventoryNumber: 'INV-SW-003',
      manufacturer: 'Adobe',
      model: 'Creative Cloud All Apps',
      departmentId: hrDept.id,
      purchaseDate: '2026-03-01',
      warrantyExpiry: '2025-03-01',
      purchaseCost: '250000',
      notes: '5 лицензия, дизайн тобы',
    },
    // --- Licenses ---
    {
      name: 'Windows 11 Pro лицензия',
      assetType: 'license',
      status: 'active',
      inventoryNumber: 'INV-LIC-001',
      manufacturer: 'Microsoft',
      model: 'Windows 11 Pro',
      departmentId: itDept.id,
      purchaseDate: '2026-01-01',
      purchaseCost: '75000',
      notes: '30 лицензиялық кілт',
    },
    {
      name: 'VMware vSphere Standard',
      assetType: 'license',
      status: 'active',
      inventoryNumber: 'INV-LIC-002',
      manufacturer: 'VMware',
      model: 'vSphere Standard',
      departmentId: itDept.id,
      purchaseDate: '2023-06-01',
      warrantyExpiry: '2025-06-01',
      purchaseCost: '1200000',
      notes: 'Виртуализация серверлік бөлме',
    },
    // Maintenance
    {
      name: 'Brother MFC-L2750DW',
      assetType: 'hardware',
      status: 'maintenance',
      serialNumber: 'BR-L2750-016',
      inventoryNumber: 'INV-HW-009',
      manufacturer: 'Brother',
      model: 'MFC-L2750DW',
      location: 'Сервис орталығы',
      departmentId: finDept.id,
      purchaseDate: '2023-04-01',
      warrantyExpiry: '2025-04-01',
      purchaseCost: '145000',
      notes: 'Жөндеуде - тонер ауыстыру',
    },
    // --- Devices ---
    {
      name: 'Honeywell Voyager 1472g Scanner',
      assetType: 'peripheral',
      status: 'active',
      serialNumber: 'HW-1472-001',
      inventoryNumber: 'INV-DEV-001',
      manufacturer: 'Honeywell',
      model: 'Voyager 1472g',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-02-03',
      purchaseCost: '118000',
      notes: 'Қоймадағы сканерлеу құрылғысы',
    },
    {
      name: 'Samsung Galaxy Tab Active4 Pro',
      assetType: 'peripheral',
      status: 'active',
      serialNumber: 'SG-TAB-002',
      inventoryNumber: 'INV-DEV-002',
      manufacturer: 'Samsung',
      model: 'Galaxy Tab Active4 Pro',
      location: 'Офис 101',
      departmentId: itDept.id,
      purchaseDate: '2026-03-09',
      purchaseCost: '310000',
      notes: 'Мобильді тексеріс планшеті',
    },
    {
      name: 'ZKTeco KR601 Badge Reader',
      assetType: 'peripheral',
      status: 'in_stock',
      serialNumber: 'ZK-KR601-003',
      inventoryNumber: 'INV-DEV-003',
      manufacturer: 'ZKTeco',
      model: 'KR601',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-05-11',
      purchaseCost: '24000',
      notes: 'Қызметкерлер бейдждерін оқу құрылғысы',
    },
    // --- Consumables ---
    {
      name: 'A4 Office Paper Box 80gsm',
      assetType: 'peripheral',
      status: 'in_stock',
      serialNumber: 'A4-BOX-001',
      inventoryNumber: 'INV-CNS-001',
      manufacturer: 'SvetoCopy',
      model: 'A4 80gsm',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-05-15',
      purchaseCost: '18500',
      notes: 'Принтерлерге арналған A4 қағазы',
    },
    {
      name: 'AF Screen-Clene Wipes Pack',
      assetType: 'peripheral',
      status: 'in_stock',
      serialNumber: 'AF-WIPES-002',
      inventoryNumber: 'INV-CNS-002',
      manufacturer: 'AF',
      model: 'Screen-Clene',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-05-16',
      purchaseCost: '9500',
      notes: 'Жабдықтарды тазалауға арналған майлықтар',
    },
    {
      name: 'Duracell AA Battery Pack',
      assetType: 'peripheral',
      status: 'in_stock',
      serialNumber: 'DUR-AA-003',
      inventoryNumber: 'INV-CNS-003',
      manufacturer: 'Duracell',
      model: 'AA Alkaline',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-05-20',
      purchaseCost: '7200',
      notes: 'Пернетақта мен тышқанға арналған батареялар',
    },
    // --- Cases ---
    {
      name: 'DeepCool Matrexx 55 Case',
      assetType: 'hardware',
      status: 'in_stock',
      serialNumber: 'DC-M55-001',
      inventoryNumber: 'INV-CSE-001',
      manufacturer: 'DeepCool',
      model: 'Matrexx 55',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-04-19',
      purchaseCost: '39000',
      notes: 'Жаңа жұмыс станциясын жинауға арналған корпус',
    },
    {
      name: 'Supermicro CSE-825 Server Chassis',
      assetType: 'hardware',
      status: 'active',
      serialNumber: 'SM-CSE825-002',
      inventoryNumber: 'INV-CSE-002',
      manufacturer: 'Supermicro',
      model: 'CSE-825',
      location: 'Серверлік бөлме',
      departmentId: itDept.id,
      purchaseDate: '2025-12-08',
      purchaseCost: '360000',
      notes: 'Серверлік жабдыққа арналған корпус',
    },
    // --- Power distribution ---
    {
      name: 'APC Basic Rack PDU AP7553',
      assetType: 'hardware',
      status: 'active',
      serialNumber: 'AP7553-001',
      inventoryNumber: 'INV-PDU-001',
      manufacturer: 'APC',
      model: 'AP7553',
      location: 'Офис 102',
      departmentId: itDept.id,
      purchaseDate: '2026-01-22',
      purchaseCost: '78000',
      notes: 'Кеңсе стойкасына арналған PDU',
    },
    {
      name: 'APC Metered Rack PDU AP8853',
      assetType: 'hardware',
      status: 'active',
      serialNumber: 'AP8853-002',
      inventoryNumber: 'INV-PDU-002',
      manufacturer: 'APC',
      model: 'AP8853',
      location: 'Серверлік бөлме',
      departmentId: itDept.id,
      purchaseDate: '2026-01-25',
      purchaseCost: '210000',
      notes: 'Серверлік стойка үшін бақыланатын PDU',
    },
    // --- Passive devices ---
    {
      name: 'Legrand Cat6 Patch Panel 24 Port',
      assetType: 'network',
      status: 'active',
      serialNumber: 'LG-PP24-001',
      inventoryNumber: 'INV-PAS-001',
      manufacturer: 'Legrand',
      model: 'Cat6 24 Port Patch Panel',
      location: 'Серверлік бөлме',
      departmentId: itDept.id,
      purchaseDate: '2025-10-10',
      purchaseCost: '46000',
      notes: 'Коммутациялық панель',
    },
    {
      name: 'Schneider Keystone Cat6 Module Set',
      assetType: 'network',
      status: 'in_stock',
      serialNumber: 'SCH-KS-002',
      inventoryNumber: 'INV-PAS-002',
      manufacturer: 'Schneider',
      model: 'Cat6 Keystone',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-04-18',
      purchaseCost: '22000',
      notes: 'Желі розеткаларына арналған Keystone модульдері',
    },
    // --- Unmanaged assets ---
    {
      name: 'Epson EB-W51 Unmanaged Projector',
      assetType: 'peripheral',
      status: 'active',
      serialNumber: 'EPS-W51-001',
      inventoryNumber: 'INV-UNA-001',
      manufacturer: 'Epson',
      model: 'EB-W51',
      location: 'Офис 205',
      departmentId: itDept.id,
      purchaseDate: '2024-09-17',
      purchaseCost: '285000',
      notes: 'Уақытша жобаға берілген проектор',
    },
    {
      name: 'Samsung Flip Demo Display',
      assetType: 'peripheral',
      status: 'in_stock',
      serialNumber: 'SM-FLIP-002',
      inventoryNumber: 'INV-UNA-002',
      manufacturer: 'Samsung',
      model: 'Flip WM55R',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2025-02-21',
      purchaseCost: '520000',
      notes: 'Есепке алынбаған демонстрациялық экран',
    },
    // --- Cables ---
    {
      name: 'Cat6 Patch Cable Set 2m',
      assetType: 'peripheral',
      status: 'in_stock',
      serialNumber: 'CAT6-2M-001',
      inventoryNumber: 'INV-CBL-001',
      manufacturer: 'Hyperline',
      model: 'Cat6 UTP 2m',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-05-12',
      purchaseCost: '18000',
      notes: 'Cat6 патч-кордтар жинағы',
    },
    {
      name: 'HDMI Cable Set 5m',
      assetType: 'peripheral',
      status: 'in_stock',
      serialNumber: 'HDMI-5M-002',
      inventoryNumber: 'INV-CBL-002',
      manufacturer: 'Ugreen',
      model: 'HDMI 2.0 5m',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-05-12',
      purchaseCost: '26000',
      notes: 'Келіссөз бөлмесіне арналған HDMI кабельдер',
    },
    // --- SIM cards ---
    {
      name: 'Kcell Corporate SIM Backup',
      assetType: 'peripheral',
      status: 'in_stock',
      serialNumber: 'SIM-KC-001',
      inventoryNumber: 'INV-SIM-001',
      manufacturer: 'Kcell',
      model: 'Corporate SIM',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-01-10',
      purchaseCost: '0',
      notes: 'Резервтік корпоративтік SIM-карта',
    },
    {
      name: 'Tele2 IoT SIM Card',
      assetType: 'peripheral',
      status: 'active',
      serialNumber: 'SIM-T2-002',
      inventoryNumber: 'INV-SIM-002',
      manufacturer: 'Tele2',
      model: 'IoT SIM',
      location: 'Серверлік бөлме',
      departmentId: itDept.id,
      purchaseDate: '2026-02-05',
      purchaseCost: '0',
      notes: 'IoT модеміне арналған SIM-карта',
    },
    // --- VPN ---
    {
      name: 'Fortinet FortiClient VPN Licenses',
      assetType: 'license',
      status: 'active',
      serialNumber: 'FORTI-VPN-001',
      inventoryNumber: 'INV-VPN-001',
      manufacturer: 'Fortinet',
      model: 'FortiClient VPN',
      location: 'Серверлік бөлме',
      departmentId: itDept.id,
      purchaseDate: '2026-01-01',
      warrantyExpiry: '2027-01-01',
      purchaseCost: '340000',
      notes: 'Қашықтағы қызметкерлерге арналған VPN лицензиялары',
    },
    {
      name: 'YubiKey 5 NFC VPN Token Set',
      assetType: 'peripheral',
      status: 'in_stock',
      serialNumber: 'YUBI-5NFC-002',
      inventoryNumber: 'INV-VPN-002',
      manufacturer: 'Yubico',
      model: 'YubiKey 5 NFC',
      location: 'Қойма',
      departmentId: itDept.id,
      purchaseDate: '2026-03-02',
      purchaseCost: '210000',
      notes: 'Аппараттық VPN токендері',
    },
    // --- Report analytics ---
    {
      name: 'Power BI ITSM Performance Report',
      assetType: 'software',
      status: 'active',
      serialNumber: 'PBI-ITSM-001',
      inventoryNumber: 'INV-RPT-001',
      manufacturer: 'Microsoft',
      model: 'Power BI',
      location: 'Cloud',
      departmentId: itDept.id,
      purchaseDate: '2026-01-15',
      purchaseCost: '0',
      notes: 'ITSM өнімділігі бойынша Power BI есебі',
    },
    {
      name: 'Grafana Infrastructure Dashboard',
      assetType: 'software',
      status: 'active',
      serialNumber: 'GRAF-INFRA-002',
      inventoryNumber: 'INV-RPT-002',
      manufacturer: 'Grafana Labs',
      model: 'Grafana Dashboard',
      location: 'Cloud',
      departmentId: itDept.id,
      purchaseDate: '2026-02-20',
      purchaseCost: '0',
      notes: 'Инфрақұрылым мониторингіне арналған dashboard',
    },
  ]);

  // ═══════════════════════════════════════════
  //  KNOWLEDGE BASE - категории и статьи
  // ═══════════════════════════════════════════
  console.log('📚 Seeding knowledge base...');

  const [kbCatGeneral] = await db.insert(kbCategories).values({
    name: 'Жалпы нұсқаулықтар',
    description: 'Жалпы сұрақтар бойынша нұсқаулықтар',
    icon: 'BookOpen',
    sortOrder: 1,
  }).returning();

  const [kbCatNetwork] = await db.insert(kbCategories).values({
    name: 'Желі және қосылым',
    description: 'Желілік мәселелер мен VPN баптау',
    icon: 'Wifi',
    sortOrder: 2,
  }).returning();

  const [kbCatSoftware] = await db.insert(kbCategories).values({
    name: 'Бағдарламалық қамтамасыз ету',
    description: 'БҚ орнату, жаңарту және ақаулықтарды жою',
    icon: 'Monitor',
    sortOrder: 3,
  }).returning();

  const [kbCatSecurity] = await db.insert(kbCategories).values({
    name: 'Ақпараттық қауіпсіздік',
    description: 'Құпиясөз саясаты, 2FA және қауіпсіздік ережелері',
    icon: 'Shield',
    sortOrder: 4,
  }).returning();

  const [kbCatHardware] = await db.insert(kbCategories).values({
    name: 'Аппараттық құралдар',
    description: 'Принтер, сканер, монитор баптау',
    icon: 'HardDrive',
    sortOrder: 5,
  }).returning();

  // --- Articles ---
  await db.insert(kbArticles).values([
    {
      title: 'Жүйеге алғаш рет кіру нұсқаулығы',
      shortDescription: 'Жаңа қызметкерлер үшін жүйеге кіру және бастапқы баптау бойынша нұсқаулық',
      content: `# Жүйеге алғаш рет кіру

## 1. Есептік жазбаны алу
Жүйе әкімшісі сізге электрондық пошта арқылы логин мен уақытша құпиясөзді жібереді.

## 2. Жүйеге кіру
1. Браузерде жүйенің мекенжайын ашыңыз
2. Email және уақытша құпиясөзді енгізіңіз
3. **Кіру** батырмасын басыңыз

## 3. Құпиясөзді ауыстыру
Алғаш рет кіргенде құпиясөзді ауыстыруды ұсынамыз:
- **Профиль** бөліміне өтіңіз
- Жаңа құпиясөз кемінде 8 таңбадан тұруы керек
- Бас әріп, кіші әріп және сан болуы тиіс

## 4. 2FA баптау
Қауіпсіздікті арттыру үшін екі факторлы аутентификацияны қосыңыз:
1. **Баптаулар → 2FA** бөліміне өтіңіз
2. Google Authenticator немесе басқа TOTP қосымшасын пайдаланыңыз

> ⚠️ Қиындық туындаса, IT бөліміне тикет жіберіңіз.`,
      categoryId: kbCatGeneral.id,
      authorId: adminUser.id,
      tags: ['бастау', 'нұсқаулық', 'жаңа қызметкер'],
      visibility: 'public',
    },
    {
      title: 'Тикет құру және қадағалау',
      shortDescription: 'Техникалық мәселе бойынша тикет қалай құрылады',
      content: `# Тикет құру

## Жаңа тикет ашу
1. Бүйірлік мәзірден **Тикеттер** бөлімін таңдаңыз
2. **Жаңа тикет** батырмасын басыңыз
3. Форманы толтырыңыз:
   - **Тақырып**: Мәселенің қысқаша сипаттамасы
   - **Сипаттама**: Толық мәлімет, қадамдар, скриншоттар
   - **Категория**: Сәйкес категорияны таңдаңыз
   - **Приоритет**: Low / Medium / High / Critical

## Приоритеттер
| Приоритет | Сипаттама | SLA жауап |
|-----------|-----------|-----------|
| Low | Кішігірім мәселе | 8 сағат |
| Medium | Жұмысқа әсері бар | 4 сағат |
| High | Жұмыс тоқтап тұр | 1 сағат |
| Critical | Бүкіл бөлім тоқтады | 30 мин |

## Тикетті қадағалау
- Тикеттер тізімінде статусты көре аласыз
- Жаңа жауаптар туралы хабарлама аласыз`,
      categoryId: kbCatGeneral.id,
      authorId: adminUser.id,
      tags: ['тикет', 'қолдау', 'SLA'],
      visibility: 'public',
    },
    {
      title: 'VPN қосылу нұсқаулығы',
      shortDescription: 'Корпоративтік VPN желісіне қосылу қадамдары',
      content: `# VPN қосылу

## Талаптар
- Компанияның VPN клиенті орнатылған болуы керек
- IT бөлімінен VPN сертификаты алынған болуы тиіс

## Windows жүйесінде
1. **FortiClient** қосымшасын ашыңыз
2. VPN серверін таңдаңыз: \`vpn.qazaq-gen.kz\`
3. Логин мен құпиясөзді енгізіңіз
4. **Connect** батырмасын басыңыз

## macOS жүйесінде
1. **FortiClient** қосымшасын ашыңыз
2. Профильді таңдап, **Connect** басыңыз
3. 2FA кодын енгізіңіз

## Жиі кездесетін мәселелер
- **Қосыла алмаймын**: Интернет қосылымын тексеріңіз
- **Сертификат қатесі**: IT бөліміне хабарласыңыз
- **Баяу жылдамдық**: Жақын серверді таңдаңыз

> 💡 VPN тек жұмыс уақытында қосулы болсын.`,
      categoryId: kbCatNetwork.id,
      authorId: agentUser.id,
      tags: ['VPN', 'желі', 'қашықтан жұмыс'],
      visibility: 'public',
    },
    {
      title: 'Wi-Fi желісіне қосылу',
      shortDescription: 'Корпоративтік Wi-Fi желісін баптау',
      content: `# Корпоративтік Wi-Fi

## Желі атаулары
- **QG-Corporate** - жұмыс құрылғылары үшін (WPA2-Enterprise)
- **QG-Guest** - қонақтар үшін (пароль IT бөлімінде)

## QG-Corporate қосылу
1. Wi-Fi тізімінен **QG-Corporate** таңдаңыз
2. **Пайдаланушы аты**: корпоративтік email
3. **Құпиясөз**: жүйедегі құпиясөз
4. Сертификатты қабылдаңыз

## Ақаулықтарды жою
- Wi-Fi өшіріп, қайта қосыңыз
- Желіні ұмытып, қайта қосылыңыз
- DNS: 8.8.8.8 қолданып көріңіз`,
      categoryId: kbCatNetwork.id,
      authorId: agentUser.id,
      tags: ['Wi-Fi', 'желі', 'баптау'],
      visibility: 'public',
    },
    {
      title: 'Microsoft Office 365 орнату',
      shortDescription: 'Office 365 бағдарламаларын орнату және белсендіру',
      content: `# Office 365 орнату

## 1. Лицензияны алу
IT бөліміне тикет жіберіңіз: "Office 365 лицензиясы керек"

## 2. Орнату
1. [office.com](https://office.com) сайтына кіріңіз
2. Корпоративтік email мен құпиясөзбен кіріңіз
3. **Office орнату** батырмасын басыңыз
4. Орнатушыны жүктеп, іске қосыңыз

## 3. Белсендіру
- Кез келген Office қосымшасын ашыңыз
- Корпоративтік email-мен кіріңіз
- Лицензия автоматты түрде белсенеді

## Құрамына кіреді
- Word, Excel, PowerPoint, Outlook
- OneDrive (1TB)
- Microsoft Teams`,
      categoryId: kbCatSoftware.id,
      authorId: adminUser.id,
      tags: ['Office', 'Microsoft', 'орнату'],
      visibility: 'public',
    },
    {
      title: '1С:Бухгалтерия қосылу мәселелері',
      shortDescription: 'Жиі кездесетін 1С мәселелері мен шешімдері',
      content: `# 1С:Бухгалтерия - ақаулықтарды жою

## "Сервер табылмады" қатесі
1. VPN қосулы екенін тексеріңіз
2. 1С серверінің мекенжайын тексеріңіз: \`1c-server.qazaq-gen.local\`
3. IT бөліміне хабарласыңыз

## Баяу жұмыс істейді
- Кэшті тазалаңыз: Әкімшілік → Кэшті тазалау
- Жергілікті кэш қалтасын жойыңыз
- Серверге қайта қосылыңыз

## Құпиясөзді ұмыттым
1С-тегі құпиясөз жүйе құпиясөзінен бөлек. IT бөліміне тикет жіберіңіз.

> ⚠️ Бұл мақала тек ішкі пайдалану үшін.`,
      categoryId: kbCatSoftware.id,
      authorId: agentUser.id,
      tags: ['1С', 'бухгалтерия', 'ақаулық'],
      visibility: 'internal',
    },
    {
      title: 'Құпиясөз саясаты',
      shortDescription: 'Компанияның құпиясөз талаптары мен ережелері',
      content: `# Құпиясөз саясаты

## Міндетті талаптар
- Кемінде **8 таңба**
- Бас және кіші әріптер
- Кемінде 1 сан
- Кемінде 1 арнайы таңба (!@#$%^&*)

## Тыйым салынады
- ❌ Аты-жөніңізді пайдалану
- ❌ Туған күнді пайдалану
- ❌ Бір құпиясөзді бірнеше жерде пайдалану
- ❌ Құпиясөзді басқаларға айту

## Ауыстыру кестесі
- Құпиясөзді **90 күн** сайын ауыстыру міндетті
- Соңғы 5 құпиясөзді қайта пайдалану мүмкін емес

## 2FA
Барлық қызметкерлерге екі факторлы аутентификация **міндетті**.`,
      categoryId: kbCatSecurity.id,
      authorId: adminUser.id,
      tags: ['құпиясөз', 'қауіпсіздік', 'саясат'],
      visibility: 'public',
    },
    {
      title: 'Фишинг шабуылдарынан қорғану',
      shortDescription: 'Фишинг хаттарды тану және қорғану әдістері',
      content: `# Фишинг шабуылдарынан қорғану

## Фишинг белгілері
- 📧 Күтпеген жіберуші
- ⚠️ Шұғыл әрекет талап ету ("Құпиясөзіңіз бұғатталады!")
- 🔗 Күмәнді сілтемелер
- 📎 Күтпеген тіркемелер

## Не істеу керек?
1. **Сілтемеге баспаңыз** - алдымен тексеріңіз
2. Жіберуші мекенжайын мұқият қараңыз
3. Күмәнді хатты IT бөліміне жіберіңіз
4. Тіркемелерді ашпаңыз

## Фишинг хатты хабарлау
1. Хатты ашыңыз → **Тағы** → **Фишинг ретінде хабарлау**
2. Немесе IT бөліміне тикет жіберіңіз

> 🛡️ Күмәнданғаныңыз жөн - сақтық артық емес!`,
      categoryId: kbCatSecurity.id,
      authorId: adminUser.id,
      tags: ['фишинг', 'қауіпсіздік', 'email'],
      visibility: 'public',
    },
    {
      title: 'Принтерді баптау және мәселелерді шешу',
      shortDescription: 'Желілік принтерді қосу және жиі кездесетін мәселелер',
      content: `# Принтерді баптау

## Желілік принтерді қосу (Windows)
1. **Баптаулар → Принтерлер** бөлімін ашыңыз
2. **Принтер қосу** батырмасын басыңыз
3. IP мекенжайын енгізіңіз (IT бөлімінен сұраңыз)
4. Драйверді таңдаңыз

## Жиі кездесетін мәселелер

### Басылмайды
- Принтер қосулы ма тексеріңіз
- Кезекті тазалаңыз: Принтер → Кезекті көру → Барлығын болдырмау
- Принтерді қайта қосыңыз

### Қағаз кептеліп қалды
1. Принтерді өшіріңіз
2. Қағазды ақырын шығарыңыз
3. 30 секунд күтіп, қайта қосыңыз

### Бояу (тонер) біткен
IT бөліміне "Тонер ауыстыру" тикетін жіберіңіз.`,
      categoryId: kbCatHardware.id,
      authorId: agentUser.id,
      tags: ['принтер', 'аппарат', 'баптау'],
      visibility: 'public',
    },
    {
      title: 'Жаңа қызметкерді жүйеге қосу (IT нұсқаулық)',
      shortDescription: 'IT мамандары үшін жаңа қызметкерді баптау чеклисті',
      content: `# Жаңа қызметкерді жүйеге қосу

> ⚠️ Бұл мақала тек IT мамандары үшін (ішкі).

## Чеклист
- [ ] Active Directory-де есептік жазба құру
- [ ] Email жасау (admin@qazaq-gen.kz)
- [ ] ITSM жүйесінде профиль құру
- [ ] Office 365 лицензиясын тағайындау
- [ ] VPN сертификатын жасау
- [ ] Компьютер дайындау және тапсыру
- [ ] Принтерді баптау
- [ ] 1С қосу (қажет болса)
- [ ] Қауіпсіздік нұсқаулығын жіберу

## Қажетті ақпарат
- ФИО, лауазым, бөлім
- Менеджердің аты
- Қажетті БҚ тізімі
- Бастау күні`,
      categoryId: kbCatGeneral.id,
      authorId: adminUser.id,
      tags: ['onboarding', 'IT', 'чеклист'],
      visibility: 'internal',
    },
  ]);

  // ═══════════════════════════════════════════
  //  TICKETS - тестовые заявки
  // ═══════════════════════════════════════════
  console.log('🎫 Seeding tickets...');

  // Create an employee user for realistic tickets
  const empHash = await bcrypt.hash('employee123', 12);
  const [empUser] = await db.insert(users).values({
    email: 'employee@qazaq.gen',
    passwordHash: empHash,
  }).returning();

  await db.insert(profiles).values({
    userId: empUser.id,
    email: 'employee@qazaq.gen',
    name: 'Камилла Кайраткызы',
    departmentId: finDept.id,
  });

  await db.insert(userRoles).values({ userId: empUser.id, role: 'employee' });

  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000);
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  // Ticket 1: Critical, in_progress
  const [t1] = await db.insert(tickets).values({
    title: 'Сервер жауап бермейді - 1С жұмыс істемейді',
    description: 'Dell PowerEdge R740 сервері қайта жүктелгеннен кейін 1С:Бухгалтерия жүйесі қолжетімсіз. Бүкіл қаржы бөлімі жұмыс істей алмайды. Шұғыл шешім қажет!',
    requesterId: empUser.id,
    assigneeId: agentUser.id,
    categoryId: catSupport.id,
    priority: 'critical',
    status: 'in_progress',
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(1),
  }).returning();

  await db.insert(ticketSla).values({
    ticketId: t1.id,
    responseDue: hoursAgo(2.5),
    resolveDue: hoursAgo(-1),
    respondedAt: hoursAgo(2.8),
    breachedResponse: false,
    breachedResolve: false,
  });

  await db.insert(ticketComments).values([
    { ticketId: t1.id, authorId: agentUser.id, body: 'Серверге қосылдым, диагностика жүргізуде. RAM модулінде қате табылды.', isInternal: false, createdAt: hoursAgo(2.5) },
    { ticketId: t1.id, authorId: agentUser.id, body: 'Ішкі: RAM модулін ауыстыру керек, қоймадан алу керек.', isInternal: true, createdAt: hoursAgo(2) },
  ]);

  await db.insert(ticketHistory).values([
    { ticketId: t1.id, actorId: agentUser.id, field: 'status', oldValue: 'new', newValue: 'assigned', createdAt: hoursAgo(2.8) },
    { ticketId: t1.id, actorId: agentUser.id, field: 'status', oldValue: 'assigned', newValue: 'in_progress', createdAt: hoursAgo(2.5) },
  ]);

  // Ticket 2: High, assigned
  const [t2] = await db.insert(tickets).values({
    title: 'VPN қосылмайды - қашықтан жұмыс істей алмаймын',
    description: 'FortiClient "Connection timed out" қатесін көрсетеді. Кеше жұмыс істеп тұрды, бүгін қосыла алмаймын. Маңызды есеп тапсыру керек.',
    requesterId: empUser.id,
    assigneeId: agentUser.id,
    categoryId: catNetwork.id,
    priority: 'high',
    status: 'assigned',
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(4),
  }).returning();

  await db.insert(ticketSla).values({
    ticketId: t2.id,
    responseDue: hoursAgo(4),
    resolveDue: hoursAgo(1),
    respondedAt: hoursAgo(4.5),
    breachedResponse: false,
    breachedResolve: false,
  });

  // Ticket 3: Medium, new (unassigned)
  const [t3] = await db.insert(tickets).values({
    title: 'Office 365 лицензиясы қажет - жаңа қызметкер',
    description: 'HR бөліміне жаңа қызметкер келді (Бауыржан Ахметов). Office 365 Business Premium лицензиясын тағайындау керек.',
    requesterId: empUser.id,
    categoryId: catSoftware.id,
    priority: 'medium',
    status: 'new',
    createdAt: hoursAgo(8),
    updatedAt: hoursAgo(8),
  }).returning();

  await db.insert(ticketSla).values({
    ticketId: t3.id,
    responseDue: hoursAgo(4),
    resolveDue: new Date(now.getTime() + 8 * 3600000),
    breachedResponse: true,
    breachedResolve: false,
  });

  // Ticket 4: Low, resolved
  const [t4] = await db.insert(tickets).values({
    title: 'Принтерде тонер біткен - 2 этаж',
    description: 'HP LaserJet Pro M404dn принтерінде тонер біткен. Басып шығара алмаймыз.',
    requesterId: empUser.id,
    assigneeId: agentUser.id,
    categoryId: catHardware.id,
    priority: 'low',
    status: 'resolved',
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  }).returning();

  await db.insert(ticketSla).values({
    ticketId: t4.id,
    responseDue: daysAgo(2.5),
    resolveDue: daysAgo(2),
    respondedAt: daysAgo(2.8),
    breachedResponse: false,
    breachedResolve: false,
  });

  await db.insert(ticketComments).values({
    ticketId: t4.id, authorId: agentUser.id, body: 'Тонер картриджі ауыстырылды. Принтер жұмыс істейді.', isInternal: false, createdAt: daysAgo(2),
  });

  await db.insert(ticketHistory).values([
    { ticketId: t4.id, actorId: agentUser.id, field: 'status', oldValue: 'new', newValue: 'assigned', createdAt: daysAgo(2.8) },
    { ticketId: t4.id, actorId: agentUser.id, field: 'status', oldValue: 'assigned', newValue: 'in_progress', createdAt: daysAgo(2.5) },
    { ticketId: t4.id, actorId: agentUser.id, field: 'status', oldValue: 'in_progress', newValue: 'resolved', createdAt: daysAgo(2) },
  ]);

  // Ticket 5: Medium, closed
  const [t5] = await db.insert(tickets).values({
    title: 'Жаңа монитор сұрау - Samsung 27"',
    description: 'Ескі монитор жыпылықтайды, көз шаршайды. Жаңа Samsung 27" 4K монитор алуға сұраныс.',
    requesterId: empUser.id,
    assigneeId: adminUser.id,
    categoryId: catHardware.id,
    priority: 'medium',
    status: 'closed',
    createdAt: daysAgo(14),
    updatedAt: daysAgo(10),
    closedAt: daysAgo(10),
  }).returning();

  await db.insert(ticketSla).values({
    ticketId: t5.id,
    responseDue: daysAgo(13.5),
    resolveDue: daysAgo(12),
    respondedAt: daysAgo(13.8),
    breachedResponse: false,
    breachedResolve: false,
  });

  // Ticket 6: High, reopened
  const [t6] = await db.insert(tickets).values({
    title: 'Wi-Fi үзіліп қалады - 3 этаж',
    description: 'QG-Corporate Wi-Fi желісі 3 этажда үнемі үзіледі. Күніне 5-6 рет қайта қосылу керек. Жұмысқа кедергі жасайды.',
    requesterId: empUser.id,
    assigneeId: agentUser.id,
    categoryId: catNetwork.id,
    priority: 'high',
    status: 'reopened',
    reopenedCount: 1,
    createdAt: daysAgo(7),
    updatedAt: daysAgo(1),
  }).returning();

  await db.insert(ticketSla).values({
    ticketId: t6.id,
    responseDue: daysAgo(6.5),
    resolveDue: daysAgo(5),
    respondedAt: daysAgo(6.8),
    breachedResponse: false,
    breachedResolve: true,
  });

  await db.insert(ticketComments).values([
    { ticketId: t6.id, authorId: agentUser.id, body: 'Access point-ті қайта жүктедік, тексеріңіз.', isInternal: false, createdAt: daysAgo(5) },
    { ticketId: t6.id, authorId: empUser.id, body: 'Мәселе қайта басталды, Wi-Fi тағы үзіледі.', isInternal: false, createdAt: daysAgo(1) },
  ]);

  await db.insert(ticketHistory).values([
    { ticketId: t6.id, actorId: agentUser.id, field: 'status', oldValue: 'new', newValue: 'assigned', createdAt: daysAgo(6.8) },
    { ticketId: t6.id, actorId: agentUser.id, field: 'status', oldValue: 'assigned', newValue: 'resolved', createdAt: daysAgo(5) },
    { ticketId: t6.id, actorId: empUser.id, field: 'status', oldValue: 'resolved', newValue: 'reopened', createdAt: daysAgo(1) },
  ]);

  // Ticket 7: Critical, new
  const [t7] = await db.insert(tickets).values({
    title: 'Email жүйесі жұмыс істемейді - бүкіл компания',
    description: 'Outlook арқылы хат жіберу мен алу мүмкін емес. Exchange серверінде мәселе болуы мүмкін. Барлық бөлімдерге әсер етеді.',
    requesterId: adminUser.id,
    categoryId: catSupport.id,
    priority: 'critical',
    status: 'new',
    createdAt: hoursAgo(1),
    updatedAt: hoursAgo(1),
  }).returning();

  await db.insert(ticketSla).values({
    ticketId: t7.id,
    responseDue: hoursAgo(0.5),
    resolveDue: new Date(now.getTime() + 2 * 3600000),
    breachedResponse: true,
    breachedResolve: false,
  });

  // Ticket 8: Low, in_progress
  await db.insert(tickets).values({
    title: 'Жұмыс үстеліне қосымша USB-хаб қажет',
    description: 'Ноутбукта USB порт жеткіліксіз. 4 порттық USB-C хаб сұраймын.',
    requesterId: empUser.id,
    assigneeId: agentUser.id,
    categoryId: catHardware.id,
    priority: 'low',
    status: 'in_progress',
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  });

  // Ticket 9: Medium, assigned
  await db.insert(tickets).values({
    title: 'Adobe Creative Cloud лицензиясын жаңарту',
    description: 'Дизайн тобының Adobe CC лицензиясы 2 аптадан кейін аяқталады. Жаңартуды ұйымдастыру керек.',
    requesterId: empUser.id,
    assigneeId: adminUser.id,
    categoryId: catSoftware.id,
    priority: 'medium',
    status: 'assigned',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(4),
  });

  // Ticket 10: High, resolved
  await db.insert(tickets).values({
    title: 'Антивирус жаңартуы кейбір БҚ-ны блоктайды',
    description: 'Kaspersky соңғы жаңартуынан кейін ішкі CRM жүйесіне кіру блокталды. False positive болуы мүмкін.',
    requesterId: empUser.id,
    assigneeId: agentUser.id,
    categoryId: catSoftware.id,
    priority: 'high',
    status: 'resolved',
    createdAt: daysAgo(4),
    updatedAt: daysAgo(3),
  });

  console.log('✅ Seed complete!');
  console.log('👤 Admin: admin@qazaq.gen / admin123');
  console.log('👤 Agent: agent@qazaq.gen / agent123');
  console.log('👤 Employee: employee@qazaq.gen / employee123');
  console.log('📦 16 assets created');
  console.log('📚 5 KB categories + 10 articles created');
  console.log('🎫 10 tickets created');

  await pool.end();
}

seed().catch(console.error);
