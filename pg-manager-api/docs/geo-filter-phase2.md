# Geolocation Filtering Phase 2

## Goal
Enable "near me" and radius-based property discovery on public browse.

## Recommended Sequence

1. Add nullable `latitude` and `longitude` columns on `properties`.
2. Backfill imported properties using geocoding from address/city/state/pincode.
3. Geocode owner-created properties on create/update when address fields change.
4. Add public API query params: `lat`, `lng`, `radiusKm`, `sort=distance`.
5. Compute distance in SQL (haversine) with fallback to existing sort when no coordinates.
6. App explorer UI:
   - Use current location prompt.
   - Radius selector (e.g. 1km/3km/5km/10km).
   - Distance badge on cards.

## Data Contract

- Public list response should include:
  - `distanceKm` when `lat/lng` provided.
  - Existing fields unchanged for compatibility.

## Risks

- Geocoding quota/failures.
- Inconsistent addresses reducing geocode quality.
- Location permission denial in app.

## Mitigations

- Cache geocode results and retry asynchronously.
- Keep radius filter optional.
- Preserve city/state fallback filtering when coordinates unavailable.
