-- Add brand column to food_items table
ALTER TABLE food_items
ADD COLUMN IF NOT EXISTS brand VARCHAR(255);

-- Add index for brand column to optimize queries that filter by brand
CREATE INDEX IF NOT EXISTS idx_food_items_brand ON food_items(brand);