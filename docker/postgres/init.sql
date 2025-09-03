-- Initialize pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE fluxoalfa'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fluxoalfa')\gexec