-- Add GIN index for food search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add index for name search
CREATE INDEX IF NOT EXISTS idx_food_items_name_gin ON food_items USING gin (name gin_trgm_ops);

-- Add index for source and source_id
CREATE INDEX IF NOT EXISTS idx_food_items_source_source_id ON food_items(source, source_id);

-- Add index for barcode
CREATE INDEX IF NOT EXISTS idx_food_items_barcode ON food_items(barcode);