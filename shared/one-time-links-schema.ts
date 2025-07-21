import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// One-time links for form submissions
export const oneTimeLinks = pgTable("one_time_links", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  formType: text("form_type").notNull(), // manager, dancer, staff, etc.
  clubId: integer("club_id").notNull(),
  createdBy: integer("created_by").notNull(),
  recipientEmail: text("recipient_email"),
  recipientName: text("recipient_name"),
  isUsed: boolean("is_used").default(false),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// Form submissions for approval
export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  linkId: integer("link_id").references(() => oneTimeLinks.id),
  formType: text("form_type").notNull(),
  clubId: integer("club_id").notNull(),
  submitterEmail: text("submitter_email"),
  submitterName: text("submitter_name"),
  formData: json("form_data").$type<Record<string, any>>().notNull(),
  status: text("status").default("pending"), // pending, approved, rejected
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Export schemas
export const insertOneTimeLinkSchema = createInsertSchema(oneTimeLinks);
export const insertFormSubmissionSchema = createInsertSchema(formSubmissions);

export type OneTimeLink = typeof oneTimeLinks.$inferSelect;
export type InsertOneTimeLink = z.infer<typeof insertOneTimeLinkSchema>;
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;