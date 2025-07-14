-- Initialize the Teacher Hub database
-- This script runs when the PostgreSQL container starts for the first time

-- Create database if it doesn't exist (this is handled by POSTGRES_DB environment variable)
-- CREATE DATABASE IF NOT EXISTS teacher_hub;

-- Create extensions that might be needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Create a user for the application (optional, handled by environment variables)
-- The main user is created via POSTGRES_USER environment variable

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Teacher Hub database initialized successfully';
END $$; 