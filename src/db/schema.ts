import { pgTable, text, integer, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

export const validationJobs = pgTable("validation_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  totalEmails: integer("total_emails").default(0).notNull(),
  processedEmails: integer("processed_emails").default(0).notNull(),
  status: text("status").default("pending").notNull(), // pending, running, completed, failed
  source: text("source").default("manual").notNull(), // manual, file, sheets
});

export const emailResults = pgTable("email_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").references(() => validationJobs.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull(),
  originalRecord: text("original_record").notNull(),
  status: text("status").notNull(), // live, disabled, unregistered, unknown, verify
  wellFormed: integer("well_formed").default(0), // 0=false, 1=true
  validDomain: integer("valid_domain"), // null=unknown, 0=false, 1=true
  validMailbox: integer("valid_mailbox"), // null=unknown, 0=false, 1=true
  mxRecords: jsonb("mx_records"),
  errorMessage: text("error_message"),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
});
