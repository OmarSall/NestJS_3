-- Add new column
ALTER TABLE "Product"
    ADD COLUMN "isInStock" BOOLEAN DEFAULT false;

-- Migrate data
UPDATE "Product"
SET "isInStock" = CASE
  WHEN "quantity" > 0 THEN true
  ELSE false
END;

-- Make new column NOT NULL
ALTER TABLE "Product" ALTER COLUMN "isInStock" SET NOT NULL;

-- Drop old column
ALTER TABLE "Product" DROP COLUMN "quantity";