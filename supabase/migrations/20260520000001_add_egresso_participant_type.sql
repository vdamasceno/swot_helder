-- Add 'egresso' value to participant_type enum (was missing from initial migration)
alter type public.participant_type add value if not exists 'egresso';
