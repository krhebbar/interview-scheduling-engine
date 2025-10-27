/**
 * Time Conflict Detection Utilities
 *
 * Provides sophisticated algorithms for detecting various types of time overlaps
 * between interview slots, calendar events, and other time ranges.
 *
 * Time complexity: O(1) for all overlap checks
 * Space complexity: O(1)
 */

import type { TimeChunk, OverlapType } from '../types';

/**
 * Check if two time chunks overlap in any way
 *
 * @param chunk1 - First time range
 * @param chunk2 - Second time range
 * @returns True if any overlap exists
 *
 * @example
 * ```typescript
 * isTimeOverlap(
 *   { startTime: '09:00', endTime: '10:00' },
 *   { startTime: '09:30', endTime: '10:30' }
 * ); // true (overlap from 09:30-10:00)
 * ```
 */
export function isTimeOverlap(chunk1: TimeChunk, chunk2: TimeChunk): boolean {
  const start1 = normalizeTime(chunk1.startTime);
  const end1 = normalizeTime(chunk1.endTime);
  const start2 = normalizeTime(chunk2.startTime);
  const end2 = normalizeTime(chunk2.endTime);

  // No overlap if one ends before the other starts
  return !(end1 <= start2 || start1 >= end2);
}

/**
 * Determine the type of overlap between two time chunks
 *
 * @param chunk1 - First time range
 * @param chunk2 - Second time range
 * @returns Type of overlap
 *
 * Types:
 * - 'none': No overlap
 * - 'exact': Same start and end times
 * - 'left': chunk1 starts before chunk2 and overlaps on left side
 * - 'right': chunk1 extends past chunk2 on right side
 * - 'enclosed': chunk1 is fully contained within chunk2
 * - 'encloses': chunk1 fully contains chunk2
 *
 * @example
 * ```typescript
 * getOverlapType(
 *   { startTime: '09:00', endTime: '11:00' },
 *   { startTime: '10:00', endTime: '12:00' }
 * ); // 'left' (chunk1 overlaps left side of chunk2)
 * ```
 */
export function getOverlapType(chunk1: TimeChunk, chunk2: TimeChunk): OverlapType {
  const start1 = normalizeTime(chunk1.startTime);
  const end1 = normalizeTime(chunk1.endTime);
  const start2 = normalizeTime(chunk2.startTime);
  const end2 = normalizeTime(chunk2.endTime);

  // No overlap
  if (end1 <= start2 || start1 >= end2) {
    return 'none';
  }

  // Exact match
  if (start1 === start2 && end1 === end2) {
    return 'exact';
  }

  // chunk1 fully encloses chunk2
  if (start1 <= start2 && end1 >= end2) {
    return 'encloses';
  }

  // chunk1 fully enclosed by chunk2
  if (start1 >= start2 && end1 <= end2) {
    return 'enclosed';
  }

  // chunk1 overlaps left side of chunk2
  if (start1 < start2 && end1 > start2 && end1 < end2) {
    return 'left';
  }

  // chunk1 overlaps right side of chunk2
  if (start1 > start2 && start1 < end2 && end1 > end2) {
    return 'right';
  }

  return 'none';
}

/**
 * Check if chunk1 overlaps the left side of chunk2
 *
 * @example
 * ```typescript
 * // chunk1: |-------|
 * // chunk2:     |-------|
 * isLeftOverlap(chunk1, chunk2); // true
 * ```
 */
export function isLeftOverlap(chunk1: TimeChunk, chunk2: TimeChunk): boolean {
  const start1 = normalizeTime(chunk1.startTime);
  const end1 = normalizeTime(chunk1.endTime);
  const start2 = normalizeTime(chunk2.startTime);
  const end2 = normalizeTime(chunk2.endTime);

  return start1 < start2 && end1 > start2 && end1 < end2;
}

/**
 * Check if chunk1 overlaps the right side of chunk2
 *
 * @example
 * ```typescript
 * // chunk1:     |-------|
 * // chunk2: |-------|
 * isRightOverlap(chunk1, chunk2); // true
 * ```
 */
export function isRightOverlap(chunk1: TimeChunk, chunk2: TimeChunk): boolean {
  const start1 = normalizeTime(chunk1.startTime);
  const end1 = normalizeTime(chunk1.endTime);
  const start2 = normalizeTime(chunk2.startTime);
  const end2 = normalizeTime(chunk2.endTime);

  return start1 > start2 && start1 < end2 && end1 > end2;
}

/**
 * Check if chunk1 is fully enclosed within chunk2
 *
 * @example
 * ```typescript
 * // chunk1:   |---|
 * // chunk2: |-------|
 * isEnclosed(chunk1, chunk2); // true
 * ```
 */
export function isEnclosed(chunk1: TimeChunk, chunk2: TimeChunk): boolean {
  const start1 = normalizeTime(chunk1.startTime);
  const end1 = normalizeTime(chunk1.endTime);
  const start2 = normalizeTime(chunk2.startTime);
  const end2 = normalizeTime(chunk2.endTime);

  return start1 >= start2 && end1 <= end2;
}

/**
 * Check if chunk1 fully encloses chunk2
 *
 * @example
 * ```typescript
 * // chunk1: |-------|
 * // chunk2:   |---|
 * isEncloses(chunk1, chunk2); // true
 * ```
 */
export function isEncloses(chunk1: TimeChunk, chunk2: TimeChunk): boolean {
  const start1 = normalizeTime(chunk1.startTime);
  const end1 = normalizeTime(chunk1.endTime);
  const start2 = normalizeTime(chunk2.startTime);
  const end2 = normalizeTime(chunk2.endTime);

  return start1 <= start2 && end1 >= end2;
}

/**
 * Check if two time chunks are exactly the same
 */
export function isExactMatch(chunk1: TimeChunk, chunk2: TimeChunk): boolean {
  const start1 = normalizeTime(chunk1.startTime);
  const end1 = normalizeTime(chunk1.endTime);
  const start2 = normalizeTime(chunk2.startTime);
  const end2 = normalizeTime(chunk2.endTime);

  return start1 === start2 && end1 === end2;
}

/**
 * Calculate the duration of overlap between two time chunks in minutes
 *
 * @returns Duration of overlap in minutes, or 0 if no overlap
 *
 * @example
 * ```typescript
 * getOverlapDuration(
 *   { startTime: '09:00', endTime: '10:00' },
 *   { startTime: '09:30', endTime: '10:30' }
 * ); // 30 (minutes)
 * ```
 */
export function getOverlapDuration(chunk1: TimeChunk, chunk2: TimeChunk): number {
  const start1 = normalizeTime(chunk1.startTime);
  const end1 = normalizeTime(chunk1.endTime);
  const start2 = normalizeTime(chunk2.startTime);
  const end2 = normalizeTime(chunk2.endTime);

  // No overlap
  if (end1 <= start2 || start1 >= end2) {
    return 0;
  }

  // Calculate overlap
  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);

  return overlapEnd - overlapStart;
}

/**
 * Calculate time difference between two time points in minutes
 *
 * @param time1 - First time point
 * @param time2 - Second time point
 * @returns Difference in minutes (can be negative)
 *
 * @example
 * ```typescript
 * getTimeDifference('09:00', '10:30'); // 90
 * getTimeDifference('10:30', '09:00'); // -90
 * ```
 */
export function getTimeDifference(
  time1: string | number,
  time2: string | number
): number {
  const t1 = normalizeTime(time1);
  const t2 = normalizeTime(time2);

  return t2 - t1;
}

/**
 * Find all overlaps in a list of time chunks
 *
 * Useful for detecting multiple conflicts in a schedule
 *
 * @param chunks - Array of time chunks to check
 * @returns Array of overlap pairs with indices
 *
 * Time complexity: O(n²) where n is number of chunks
 *
 * @example
 * ```typescript
 * const chunks = [
 *   { startTime: '09:00', endTime: '10:00' },
 *   { startTime: '09:30', endTime: '10:30' },
 *   { startTime: '11:00', endTime: '12:00' },
 * ];
 * findAllOverlaps(chunks);
 * // [{ index1: 0, index2: 1, overlapType: 'left' }]
 * ```
 */
export function findAllOverlaps(
  chunks: TimeChunk[]
): Array<{ index1: number; index2: number; overlapType: OverlapType }> {
  const overlaps: Array<{
    index1: number;
    index2: number;
    overlapType: OverlapType;
  }> = [];

  for (let i = 0; i < chunks.length; i++) {
    for (let j = i + 1; j < chunks.length; j++) {
      const overlapType = getOverlapType(chunks[i], chunks[j]);
      if (overlapType !== 'none') {
        overlaps.push({
          index1: i,
          index2: j,
          overlapType,
        });
      }
    }
  }

  return overlaps;
}

/**
 * Merge overlapping time chunks into continuous ranges
 *
 * Useful for calculating total busy time
 *
 * @param chunks - Array of time chunks (can overlap)
 * @returns Array of merged, non-overlapping chunks sorted by start time
 *
 * Time complexity: O(n log n) due to sorting
 *
 * @example
 * ```typescript
 * mergeTimeChunks([
 *   { startTime: '09:00', endTime: '10:00' },
 *   { startTime: '09:30', endTime: '10:30' },
 *   { startTime: '11:00', endTime: '12:00' },
 * ]);
 * // [
 * //   { startTime: '09:00', endTime: '10:30' },
 * //   { startTime: '11:00', endTime: '12:00' },
 * // ]
 * ```
 */
export function mergeTimeChunks(chunks: TimeChunk[]): TimeChunk[] {
  if (chunks.length === 0) return [];

  // Sort by start time
  const sorted = [...chunks].sort((a, b) => {
    return normalizeTime(a.startTime) - normalizeTime(b.startTime);
  });

  const merged: TimeChunk[] = [];
  let current = { ...sorted[0] };
  let currentStart = normalizeTime(current.startTime);
  let currentEnd = normalizeTime(current.endTime);

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    const nextStart = normalizeTime(next.startTime);
    const nextEnd = normalizeTime(next.endTime);

    // Overlapping or adjacent - merge
    if (nextStart <= currentEnd) {
      currentEnd = Math.max(currentEnd, nextEnd);
      current.endTime = denormalizeTime(currentEnd, current.endTime);
    } else {
      // No overlap - push current and start new
      merged.push(current);
      current = { ...next };
      currentStart = nextStart;
      currentEnd = nextEnd;
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Calculate total duration of time chunks (handling overlaps)
 *
 * @param chunks - Array of time chunks
 * @returns Total duration in minutes
 *
 * @example
 * ```typescript
 * getTotalDuration([
 *   { startTime: '09:00', endTime: '10:00' },
 *   { startTime: '09:30', endTime: '10:30' },
 * ]); // 90 (not 120, because of overlap)
 * ```
 */
export function getTotalDuration(chunks: TimeChunk[]): number {
  const merged = mergeTimeChunks(chunks);

  return merged.reduce((total, chunk) => {
    const start = normalizeTime(chunk.startTime);
    const end = normalizeTime(chunk.endTime);
    return total + (end - start);
  }, 0);
}

/**
 * Subtract time chunks from a base range
 *
 * Returns available time slots after removing busy periods
 *
 * @param baseRange - Total time range
 * @param toSubtract - Time chunks to subtract
 * @returns Available time chunks
 *
 * @example
 * ```typescript
 * subtractTimeChunks(
 *   { startTime: '09:00', endTime: '17:00' },
 *   [
 *     { startTime: '10:00', endTime: '11:00' },
 *     { startTime: '14:00', endTime: '15:00' },
 *   ]
 * );
 * // [
 * //   { startTime: '09:00', endTime: '10:00' },
 * //   { startTime: '11:00', endTime: '14:00' },
 * //   { startTime: '15:00', endTime: '17:00' },
 * // ]
 * ```
 */
export function subtractTimeChunks(
  baseRange: TimeChunk,
  toSubtract: TimeChunk[]
): TimeChunk[] {
  if (toSubtract.length === 0) {
    return [baseRange];
  }

  // Merge and sort subtract chunks
  const merged = mergeTimeChunks(toSubtract);

  const baseStart = normalizeTime(baseRange.startTime);
  const baseEnd = normalizeTime(baseRange.endTime);

  const available: TimeChunk[] = [];
  let currentStart = baseStart;

  for (const chunk of merged) {
    const chunkStart = normalizeTime(chunk.startTime);
    const chunkEnd = normalizeTime(chunk.endTime);

    // Skip if chunk is completely outside base range
    if (chunkEnd <= baseStart || chunkStart >= baseEnd) {
      continue;
    }

    // Add available time before this chunk
    if (currentStart < chunkStart) {
      available.push({
        startTime: denormalizeTime(currentStart, baseRange.startTime),
        endTime: denormalizeTime(chunkStart, baseRange.startTime),
      });
    }

    // Move current start to end of this chunk
    currentStart = Math.max(currentStart, chunkEnd);
  }

  // Add remaining time after last chunk
  if (currentStart < baseEnd) {
    available.push({
      startTime: denormalizeTime(currentStart, baseRange.startTime),
      endTime: baseRange.endTime,
    });
  }

  return available;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize time to minutes from midnight for easy comparison
 *
 * Supports:
 * - HH:MM format: "09:30" → 570
 * - ISO 8601: "2024-02-05T09:30:00Z" → minutes from day start
 * - Number: 570 → 570 (already normalized)
 */
function normalizeTime(time: string | number): number {
  if (typeof time === 'number') {
    return time;
  }

  // ISO 8601 format
  if (time.includes('T') || time.includes('Z') || time.length > 8) {
    const date = new Date(time);
    return date.getHours() * 60 + date.getMinutes();
  }

  // HH:MM format
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert normalized time back to original format
 */
function denormalizeTime(minutes: number, originalFormat: string | number): string {
  if (typeof originalFormat === 'number') {
    return String(minutes);
  }

  // ISO 8601 format - maintain date component
  if (originalFormat.includes('T') || originalFormat.includes('Z')) {
    const date = new Date(originalFormat);
    date.setHours(Math.floor(minutes / 60));
    date.setMinutes(minutes % 60);
    return date.toISOString();
  }

  // HH:MM format
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Compare two times with minute precision
 *
 * @returns Difference in minutes (positive if time1 > time2)
 */
export function compareTimesByMinute(
  time1: string | number,
  time2: string | number
): number {
  return normalizeTime(time1) - normalizeTime(time2);
}

/**
 * Check if a time point falls within a time range
 */
export function isTimeInRange(
  time: string | number,
  range: TimeChunk
): boolean {
  const t = normalizeTime(time);
  const start = normalizeTime(range.startTime);
  const end = normalizeTime(range.endTime);

  return t >= start && t < end;
}
