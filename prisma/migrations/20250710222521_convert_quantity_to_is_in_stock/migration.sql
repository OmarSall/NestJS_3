-- Add new column
ALTER TABLE "Product"
    ADD COLUMN "isInStock" BOOLEAN NOT NULL DEFAULT false;

-- Migrate data
UPDATE "Product"
SET "isInStock" = CASE
  WHEN "quantity" > 0 THEN true
  ELSE false
END;

-- Drop old column
ALTER TABLE "Product" DROP COLUMN "quantity";