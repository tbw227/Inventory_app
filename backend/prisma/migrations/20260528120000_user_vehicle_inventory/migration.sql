-- Vehicle / truck stock carried by technicians (JSON line items, same shape as station_inventory).
ALTER TABLE "users" ADD COLUMN "vehicle_inventory" JSONB NOT NULL DEFAULT '[]';
