ALTER TABLE "sessions" ADD COLUMN "previous_refresh_token_hash" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "rotated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "revoked_reason" text;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_previous_refresh_token_hash_unique" ON "sessions" USING btree ("previous_refresh_token_hash") WHERE previous_refresh_token_hash IS NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_revoked_reason_check" CHECK (revoked_reason IN ('signed_out', 'reuse_detected', 'superseded'));