-- Mirror of backend/prisma/migrations/20260528120000_user_vehicle_inventory/migration.sql

-- Vehicle / truck stock carried by technicians (JSON line items, same shape as station_inventory).
ALTER TABLE "users" ADD COLUMN "vehicle_inventory" JSONB NOT NULL DEFAULT '[]';
