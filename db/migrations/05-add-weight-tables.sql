-- Create weight_goals table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'weight_goals') THEN
        CREATE TABLE weight_goals (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            target_weight DECIMAL(10, 2) NOT NULL,
            start_weight DECIMAL(10, 2) NOT NULL,
            start_date DATE NOT NULL,
            target_date DATE,
            is_deleted BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT unique_user_goals UNIQUE (user_id, is_deleted)
        );

        -- Add indexes for weight_goals
        CREATE INDEX idx_weight_goals_user_id ON weight_goals(user_id);
        CREATE INDEX idx_weight_goals_is_deleted ON weight_goals(is_deleted);
        CREATE INDEX idx_weight_goals_start_date ON weight_goals(start_date);
        CREATE INDEX idx_weight_goals_target_date ON weight_goals(target_date);
    END IF;
END $$;

-- Create weight_logs table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'weight_logs') THEN
        CREATE TABLE weight_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            weight DECIMAL(10, 2) NOT NULL,
            log_date DATE NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Add indexes for weight_logs
        CREATE INDEX idx_weight_logs_user_id ON weight_logs(user_id);
        CREATE INDEX idx_weight_logs_log_date ON weight_logs(log_date);
    END IF;
END $$;

-- Record migration version
INSERT INTO migration_versions (version) VALUES ('v1.0.5');