# AniSurge Modern Security Specification

## Data Invariants
1. A user profile (`/users/{userId}`) can only be created by the authenticated user with that UID.
2. Watchlist items must belong to a specific user and must have valid anime metadata.
3. History items track progress and must be immutable status-wise (only creation and deletion).
4. All timestamps (`createdAt`, `addedAt`, `watchedAt`) must be server-verified using `request.time`.

## The Dirty Dozen Payloads (Rejection Targets)
1. **Identity Spoofing**: Attempt to create a user profile with a UID that doesn't match the current user.
2. **Ghost Fields**: Attempt to add `isAdmin: true` to a user profile.
3. **ID Poisoning**: Use a 2KB string as an `animeId`.
4. **Time Spoofing**: Provide a custom `addedAt` timestamp from the client.
5. **Unauthorized Watchlist Access**: Try to list another user's watchlist.
6. **Title Bloat**: Provide an anime title that is 10,000 characters long.
7. **Invalid Status**: Set watchlist status to `LOVING_IT` (not in enum).
8. **Shadow Update**: Try to update the `animeId` of an existing watchlist item.
9. **Unverified Email**: Attempt to write data with an account that hasn't verified its email.
10. **Orphaned History**: Create a history item for a non-existent user path.
11. **Massive Display Name**: Display name exceeding 100 characters.
12. **Malicious ID Characters**: Use a document ID containing special characters that could exploit path parsing.

## Test Runner (Logic Check)
All above payloads must result in `PERMISSION_DENIED`.
