Fixes fitness calorie counters appearing in Energy Scout's household energy suggestions.

- Excludes recognizable active/total calories burned, activity, and nutrition counters from new suggestions, including counters with valid cumulative statistics.
- Uses original sensor names and translation keys as hints when the entity has been renamed.
- Preserves legitimate electrical active-energy meters and heating meters in joules or calorie units. This is a semantic filter, not a blanket unit ban.
- Leaves existing Energy configurations intact and available for review.
- Includes calorie trackers in the real-HA browser fixture to verify they stay out of the table and bulk selections.

Update through HACS and restart HA, then reload the frontend and open Energy Scout. New calorie-tracker suggestions disappear on the next scan. No changes to your activity sensors are required.
