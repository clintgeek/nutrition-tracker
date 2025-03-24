-- Add brand column to food_items table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'food_items' AND column_name = 'brand'
    ) THEN
        ALTER TABLE food_items ADD COLUMN brand VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_food_items_brand ON food_items(brand);
    END IF;
END $$;

-- Record migration version
INSERT INTO migration_versions (version) VALUES ('v1.0.7');