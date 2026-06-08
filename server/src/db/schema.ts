import {
  pgTable, pgEnum, uuid, text, timestamp, boolean, integer, numeric, jsonb, date,
  bigint, unique,
} from 'drizzle-orm/pg-core';

// --- Enums ---
export const appRoleEnum = pgEnum('app_role', ['employee', 'agent', 'manager', 'admin']);
export const ticketPriorityEnum = pgEnum('ticket_priority', ['low', 'medium', 'high', 'critical']);
export const ticketStatusEnum = pgEnum('ticket_status', ['new', 'assigned', 'in_progress', 'resolved', 'closed', 'reopened']);
export const assetTypeEnum = pgEnum('asset_type', ['hardware', 'software', 'license', 'network', 'peripheral']);
export const assetStatusEnum = pgEnum('asset_status', ['active', 'in_stock', 'maintenance', 'retired', 'disposed']);

// --- Users (replaces auth.users) ---
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  totpSecret: text('totp_secret'),
  totpEnabled: boolean('totp_enabled').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Departments ---
export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Groups ---
export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  departmentId: uuid('department_id').references(() => departments.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Categories ---
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Profiles ---
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  avatarUrl: text('avatar_url'),
  departmentId: uuid('department_id').references(() => departments.id),
  groupId: uuid('group_id').references(() => groups.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- User Roles ---
export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: appRoleEnum('role').default('employee').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.role)]);

// --- Tickets ---
export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  requesterId: uuid('requester_id').notNull().references(() => users.id),
  assigneeId: uuid('assignee_id').references(() => users.id),
  groupId: uuid('group_id').references(() => groups.id),
  categoryId: uuid('category_id').references(() => categories.id),
  priority: ticketPriorityEnum('priority').default('medium').notNull(),
  status: ticketStatusEnum('status').default('new').notNull(),
  isPlanned: boolean('is_planned').default(false).notNull(),
  plannedStartAt: timestamp('planned_start_at', { withTimezone: true }),
  plannedEndAt: timestamp('planned_end_at', { withTimezone: true }),
  planningNote: text('planning_note'),
  reopenedCount: integer('reopened_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
});

// --- Ticket Comments ---
export const ticketComments = pgTable('ticket_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').notNull().references(() => tickets.id),
  authorId: uuid('author_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  isInternal: boolean('is_internal').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Ticket History ---
export const ticketHistory = pgTable('ticket_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').notNull().references(() => tickets.id),
  actorId: uuid('actor_id').notNull().references(() => users.id),
  field: text('field').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Ticket SLA ---
export const ticketSla = pgTable('ticket_sla', {
  ticketId: uuid('ticket_id').primaryKey().references(() => tickets.id),
  responseDue: timestamp('response_due', { withTimezone: true }),
  resolveDue: timestamp('resolve_due', { withTimezone: true }),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  breachedResponse: boolean('breached_response').default(false),
  breachedResolve: boolean('breached_resolve').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Ticket Attachments ---
export const ticketAttachments = pgTable('ticket_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').notNull().references(() => tickets.id),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  filePath: text('file_path').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type'),
  sizeBytes: bigint('size_bytes', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- SLA Policies ---
export const slaPolicies = pgTable('sla_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').references(() => categories.id),
  priority: ticketPriorityEnum('priority').notNull(),
  responseMinutes: integer('response_minutes').default(60).notNull(),
  resolveMinutes: integer('resolve_minutes').default(480).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- PPR Plans ---
export const pprPlans = pgTable('ppr_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  line: text('line').default('2').notNull(),
  equipment: text('equipment').notNull(),
  location: text('location'),
  scheduledDate: date('scheduled_date').notNull(),
  frequency: text('frequency').default('monthly'),
  status: text('status').default('draft').notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  departmentId: uuid('department_id').references(() => departments.id),
  checklist: jsonb('checklist').default([]),
  signedByExecutor: uuid('signed_by_executor').references(() => users.id),
  executorSignatureDate: timestamp('executor_signature_date', { withTimezone: true }),
  signedByManager: uuid('signed_by_manager').references(() => users.id),
  managerSignatureDate: timestamp('manager_signature_date', { withTimezone: true }),
  signers: jsonb('signers').default([]),
  attachment: jsonb('attachment'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Notifications ---
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  toUserId: uuid('to_user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message'),
  payloadJson: jsonb('payload_json'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Performance Scores ---
export const performanceScores = pgTable('performance_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  score: numeric('score').notNull(),
  productivity: numeric('productivity'),
  timeliness: numeric('timeliness'),
  quality: numeric('quality'),
  breakdownJson: jsonb('breakdown_json'),
  periodMonth: text('period_month').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Reports ---
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  periodMonth: text('period_month').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Push Subscriptions ---
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Notification Preferences ---
export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  // Status change
  statusChangeInApp: boolean('status_change_in_app').default(true).notNull(),
  statusChangeEmail: boolean('status_change_email').default(true).notNull(),
  statusChangePush: boolean('status_change_push').default(true).notNull(),
  // Assignment
  assignmentInApp: boolean('assignment_in_app').default(true).notNull(),
  assignmentEmail: boolean('assignment_email').default(true).notNull(),
  assignmentPush: boolean('assignment_push').default(true).notNull(),
  // Comment
  commentInApp: boolean('comment_in_app').default(true).notNull(),
  commentEmail: boolean('comment_email').default(true).notNull(),
  commentPush: boolean('comment_push').default(true).notNull(),
  // SLA breach
  slaBreachInApp: boolean('sla_breach_in_app').default(true).notNull(),
  slaBreachEmail: boolean('sla_breach_email').default(true).notNull(),
  slaBreachPush: boolean('sla_breach_push').default(true).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Shared Documents ---
export const sharedDocuments = pgTable('shared_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  senderId: uuid('sender_id').notNull().references(() => users.id),
  recipientId: uuid('recipient_id').notNull().references(() => users.id),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileType: text('file_type').default('docx').notNull(),
  fileSize: integer('file_size'),
  message: text('message'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- KB Categories ---
export const kbCategories = pgTable('kb_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- KB Articles ---
export const kbArticles = pgTable('kb_articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  shortDescription: text('short_description'),
  content: text('content').notNull(),
  categoryId: uuid('category_id').references(() => kbCategories.id),
  authorId: uuid('author_id').notNull().references(() => users.id),
  tags: text('tags').array().default([]),
  visibility: text('visibility').default('public').notNull(),
  viewCount: integer('view_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Ticket KB Links ---
export const ticketKbLinks = pgTable('ticket_kb_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').notNull().references(() => tickets.id),
  articleId: uuid('article_id').notNull().references(() => kbArticles.id),
  linkedBy: uuid('linked_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Chat Rooms ---
export const chatRooms = pgTable('chat_rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  type: text('type').default('direct').notNull(), // 'direct' | 'group'
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Chat Room Members ---
export const chatRoomMembers = pgTable('chat_room_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull().references(() => chatRooms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Chat Messages ---
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull().references(() => chatRooms.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => users.id),
  messageType: text('message_type').default('text').notNull(), // 'text' | 'file' | 'audio'
  body: text('body').notNull(),
  fileName: text('file_name'),
  filePath: text('file_path'),
  fileMimeType: text('file_mime_type'),
  fileSize: integer('file_size'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Assets ---
export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  assetType: assetTypeEnum('asset_type').default('hardware').notNull(),
  status: assetStatusEnum('status').default('in_stock').notNull(),
  serialNumber: text('serial_number'),
  inventoryNumber: text('inventory_number'),
  manufacturer: text('manufacturer'),
  model: text('model'),
  location: text('location'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  departmentId: uuid('department_id').references(() => departments.id),
  purchaseDate: date('purchase_date'),
  warrantyExpiry: date('warranty_expiry'),
  purchaseCost: numeric('purchase_cost'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
