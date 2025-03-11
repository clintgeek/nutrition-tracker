-- Add is_deleted column to food_items table
ALTER TABLE food_items
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add index for is_deleted column to optimize queries that filter by this flag
CREATE INDEX IF NOT EXISTS idx_food_items_is_deleted ON food_items(is_deleted);