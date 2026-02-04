-- Migration to add 'director' role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'director';
