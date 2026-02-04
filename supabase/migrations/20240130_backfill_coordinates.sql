-- Backfill patients with mock coordinates (lat/lng around São Paulo for demo purposes)
-- In a real scenario, you would update specific IDs or use a geocoding service.

-- Update with variable coordinates to spread them out on the map
UPDATE patients 
SET 
  latitude = -23.5505 + (random() * 0.05 - 0.025),
  longitude = -46.6333 + (random() * 0.05 - 0.025)
WHERE latitude IS NULL;
