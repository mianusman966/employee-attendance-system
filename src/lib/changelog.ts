/**
 * Automatic Changelog Generator
 * 
 * This utility helps automatically create app_updates entries in the database
 * when new features, improvements, or bug fixes are implemented.
 */

import { supabase } from './supabase';

export interface ChangelogEntry {
  version?: string; // Optional - will auto-increment if not provided
  title: string;
  description?: string;
  updateType: 'major' | 'minor' | 'patch';
  features?: string[];
  improvements?: string[];
  bugfixes?: string[];
  breakingChanges?: string[];
  releaseDate?: Date;
  isPublished?: boolean;
}

/**
 * Parse version string into major.minor.patch
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major: major || 0, minor: minor || 0, patch: patch || 0 };
}

/**
 * Increment version based on update type
 */
function incrementVersion(
  currentVersion: string,
  type: 'major' | 'minor' | 'patch'
): string {
  const { major, minor, patch } = parseVersion(currentVersion);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      return currentVersion;
  }
}

/**
 * Get the latest version from database
 */
async function getLatestVersion(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('app_updates')
      .select('version')
      .order('release_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return '2.0.0'; // Default starting version
    }

    return data.version;
  } catch (error) {
    console.error('Error fetching latest version:', error);
    return '2.0.0';
  }
}

/**
 * Create a new changelog entry
 * 
 * Usage:
 * ```typescript
 * await createChangelog({
 *   title: 'Real-time AI Usage Tracking',
 *   description: 'Added comprehensive tracking system for AI API calls',
 *   updateType: 'minor',
 *   features: [
 *     'Track AI API calls in real-time',
 *     'Monitor response times',
 *     'Display usage analytics in System dashboard'
 *   ],
 *   improvements: [
 *     'Enhanced SystemOverview component',
 *     'Better database size estimation'
 *   ]
 * });
 * ```
 */
export async function createChangelog(entry: ChangelogEntry): Promise<{ success: boolean; version: string; error?: string }> {
  try {
    // Get latest version and increment
    const latestVersion = await getLatestVersion();
    const newVersion = entry.version || incrementVersion(latestVersion, entry.updateType);

    // Prepare the record
    const record = {
      version: newVersion,
      title: entry.title,
      description: entry.description || '',
      update_type: entry.updateType,
      features: entry.features || [],
      improvements: entry.improvements || [],
      bugfixes: entry.bugfixes || [],
      breaking_changes: entry.breakingChanges || [],
      release_date: entry.releaseDate?.toISOString() || new Date().toISOString(),
      is_published: entry.isPublished ?? true, // Default to published
    };

    // Insert into database
    const { data, error } = await supabase
      .from('app_updates')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ Changelog created: v${newVersion} - ${entry.title}`);
    
    return {
      success: true,
      version: newVersion,
    };
  } catch (error: any) {
    console.error('❌ Error creating changelog:', error);
    return {
      success: false,
      version: '',
      error: error.message,
    };
  }
}

/**
 * Quick helper to create a patch update (bug fix)
 */
export async function createPatchUpdate(title: string, bugfixes: string[]) {
  return createChangelog({
    title,
    updateType: 'patch',
    bugfixes,
  });
}

/**
 * Quick helper to create a minor update (new features)
 */
export async function createMinorUpdate(title: string, features: string[], improvements: string[] = []) {
  return createChangelog({
    title,
    updateType: 'minor',
    features,
    improvements,
  });
}

/**
 * Quick helper to create a major update (breaking changes)
 */
export async function createMajorUpdate(
  title: string,
  features: string[],
  breakingChanges: string[],
  improvements: string[] = []
) {
  return createChangelog({
    title,
    updateType: 'major',
    features,
    improvements,
    breakingChanges,
  });
}

/**
 * Example: Create changelog for current session changes
 */
export async function logCurrentSessionChanges() {
  return createChangelog({
    title: 'Real-time System Monitoring & Activity Tracking',
    description: 'Implemented comprehensive real-time tracking for AI usage, backup operations, and system metrics with automatic changelog generation',
    updateType: 'minor',
    features: [
      'Real-time AI API call tracking with usage metrics',
      'Activity logging for database backup operations',
      'Automatic changelog generation system',
      'Enhanced database size estimation',
      'System metrics auto-tracking'
    ],
    improvements: [
      'Improved SystemOverview with accurate database metrics',
      'Better text contrast in update badges',
      'Real-time metric updates every 30 seconds',
      'Enhanced activity audit trail'
    ],
    bugfixes: [
      'Fixed white text on white background in update status badges',
      'Fixed TypeScript path alias configuration',
      'Resolved module resolution issues'
    ]
  });
}
