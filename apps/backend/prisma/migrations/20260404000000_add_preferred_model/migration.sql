-- Migration: add preferred_model column to organizations
-- Created: 2026-04-04

ALTER TABLE "organizations"
ADD COLUMN IF NOT EXISTS "preferred_model" VARCHAR(100) NOT NULL DEFAULT 'claude-haiku-4-5';
