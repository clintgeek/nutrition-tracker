-- Recipe tables migration

-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    servings INTEGER NOT NULL DEFAULT 1,
    total_calories INTEGER DEFAULT 0,
    total_protein_grams DECIMAL(10, 2) DEFAULT 0,
    total_carbs_grams DECIMAL(10, 2) DEFAULT 0,
    total_fat_grams DECIMAL(10, 2) DEFAULT 0,
    sync_id VARCHAR(100),
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT recipes_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_name ON recipes(name);
CREATE INDEX idx_recipes_is_deleted ON recipes(is_deleted);
CREATE INDEX idx_recipes_name_gin ON recipes USING gin (name gin_trgm_ops);

-- Create recipe_ingredients table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    food_item_id INTEGER NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    sync_id VARCHAR(100),
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT recipe_ingredients_recipe_id_fk FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    CONSTRAINT recipe_ingredients_food_item_id_fk FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_food_item_id ON recipe_ingredients(food_item_id);
CREATE INDEX idx_recipe_ingredients_is_deleted ON recipe_ingredients(is_deleted);
CREATE INDEX idx_recipe_ingredients_order ON recipe_ingredients(order_index);

-- Create recipe_steps table
CREATE TABLE IF NOT EXISTS recipe_steps (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    sync_id VARCHAR(100),
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT recipe_steps_recipe_id_fk FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX idx_recipe_steps_recipe_id ON recipe_steps(recipe_id);
CREATE INDEX idx_recipe_steps_is_deleted ON recipe_steps(is_deleted);
CREATE INDEX idx_recipe_steps_order ON recipe_steps(order_index);

-- Add triggers to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recipes_updated_at
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipe_ingredients_updated_at
    BEFORE UPDATE ON recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipe_steps_updated_at
    BEFORE UPDATE ON recipe_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();