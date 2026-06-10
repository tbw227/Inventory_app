-- Mirror of Prisma migration 20260610130000_add_user_clerk_id

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clerk_user_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_clerk_user_id_key" ON "users"("clerk_user_id");
