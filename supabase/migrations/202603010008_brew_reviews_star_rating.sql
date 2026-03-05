-- Add star_rating column to brew_reviews
-- This is the primary public score (1–5 integer) submitted by users.
-- The existing `overall` column (flavor dimension mean) is kept as-is and
-- renamed only at the application layer (flavor_avg in RatingAggregate).
-- Existing rows intentionally receive NULL — no backfill.

ALTER TABLE brew_reviews
  ADD COLUMN star_rating smallint
    CHECK (star_rating BETWEEN 1 AND 5);
