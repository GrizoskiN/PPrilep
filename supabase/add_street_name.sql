-- Migration: add street_name to issues
-- Run in Supabase SQL editor

alter table issues add column if not exists street_name text;
