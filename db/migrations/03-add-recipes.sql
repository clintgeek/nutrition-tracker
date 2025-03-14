-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    servings INTEGER NOT NULL DEFAULT 1,
    total_calories DECIMAL(10, 2),
    total_protein_grams DECIMAL(10, 2),
    total_carbs_grams DECIMAL(10, 2),
    total_fat_grams DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_id VARCHAR(36) NOT NULL DEFAULT gen_random_uuid(),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create recipe_ingredients table for the ingredients in each recipe
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL,
    food_item_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50),
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_id VARCHAR(36) NOT NULL DEFAULT gen_random_uuid(),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    CONSTRAINT fk_food_item FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE
);

-- Add indexes for better query performance
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_sync_id ON recipes(sync_id);
CREATE INDEX idx_recipes_is_deleted ON recipes(is_deleted);
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_food_item_id ON recipe_ingredients(food_item_id);
CREATE INDEX idx_recipe_ingredients_order ON recipe_ingredients(recipe_id, order_index);

-- Add a recipe_id column to food_items to link recipes that have been converted to food items
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS recipe_id INTEGER REFERENCES recipes(id);
CREATE INDEX idx_food_items_recipe_id ON food_items(recipe_id);

-- Record migration version
INSERT INTO migration_versions (version) VALUES ('v1.0.3');