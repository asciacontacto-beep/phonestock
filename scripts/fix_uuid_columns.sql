-- Migration script to convert integer primary keys to UUIDs safely.
-- For each table: create temporary UUID column, copy data, drop old column, rename.
-- Adjust foreign key relationships accordingly.

-- Enable pgcrypto for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Example for `users` table
BEGIN;
ALTER TABLE users ADD COLUMN uuid uuid DEFAULT uuid_generate_v4() NOT NULL;
UPDATE users SET uuid = uuid_generate_v4();

-- Update foreign key references in dependent tables (example for `sales`)
ALTER TABLE sales ADD COLUMN user_uuid uuid;
UPDATE sales SET user_uuid = (SELECT uuid FROM users WHERE users.id = sales.user_id);
ALTER TABLE sales DROP CONSTRAINT sales_user_id_fkey;
ALTER TABLE sales DROP COLUMN user_id;
ALTER TABLE sales RENAME COLUMN user_uuid TO user_id;

-- Replace primary key in users
ALTER TABLE users DROP CONSTRAINT users_pkey;
ALTER TABLE users DROP COLUMN id;
ALTER TABLE users RENAME COLUMN uuid TO id;
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
COMMIT;

-- Repeat similar blocks for other tables: deposits, stock, sales, expenses
-- Ensure all foreign key constraints are updated to reference the new UUID columns.
