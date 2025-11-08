/**
 * Intelligent Changelog Auto-Generator
 * 
 * This module provides intelligent changelog generation that can be called
 * programmatically whenever changes are made to the system.
 * 
 * Usage in components:
 * ```typescript
 * import { autoLogChanges } from '@/lib/auto-changelog';
 * 
 * // After implementing features
 * await autoLogChanges({
 *   type: 'minor',
 *   title: 'New Feature Implementation',
 *   features: ['Feature 1', 'Feature 2'],
 *   improvements: ['Improvement 1'],
 *   bugfixes: ['Fix 1']
 * });
 * ```
 */

import { supabase } from './supabase';

export interface AutoChangelogInput {
  type: 'major' | 'minor' | 'patch';
  title: string;
  description?: string;
  features?: string[];
  improvements?: string[];
  bugfixes?: string[];
  breakingChanges?: string[];
}

/**
 * Automatically generate and insert changelog entry
 */
export async function autoLogChanges(input: AutoChangelogInput) {
  try {
    // Get latest version
    const { data: latestUpdate } = await supabase
      .from('app_updates')
      .select('version')
      .order('release_date', { ascending: false })
      .limit(1)
      .single();

    const currentVersion = latestUpdate?.version || '2.0.0';
    const newVersion = incrementVersion(currentVersion, input.type);

    // Create changelog entry
    const { data, error } = await supabase
      .from('app_updates')
      .insert({
        version: newVersion,
        title: input.title,
        description: input.description || '',
        update_type: input.type,
        features: input.features || [],
        improvements: input.improvements || [],
        bugfixes: input.bugfixes || [],
        breaking_changes: input.breakingChanges || [],
        release_date: new Date().toISOString(),
        is_published: true
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Changelog v${newVersion} created automatically!`);
    return { success: true, version: newVersion, data };
  } catch (error: any) {
    console.error('❌ Error auto-generating changelog:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Increment version based on type
 */
function incrementVersion(currentVersion: string, type: 'major' | 'minor' | 'patch'): string {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
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
 * Pre-configured changelog templates for common changes
 */
export const changelogTemplates = {
  // When adding new features
  newFeature: (featureName: string, details: string[] = []) => ({
    type: 'minor' as const,
    title: `New Feature: ${featureName}`,
    features: details,
    improvements: [],
    bugfixes: []
  }),

  // When fixing bugs
  bugFix: (bugDescription: string, fixes: string[] = []) => ({
    type: 'patch' as const,
    title: `Bug Fix: ${bugDescription}`,
    features: [],
    improvements: [],
    bugfixes: fixes
  }),

  // When improving existing features
  improvement: (improvementName: string, changes: string[] = []) => ({
    type: 'patch' as const,
    title: `Improvement: ${improvementName}`,
    features: [],
    improvements: changes,
    bugfixes: []
  }),

  // Major release with breaking changes
  majorRelease: (title: string, breaking: string[], features: string[] = []) => ({
    type: 'major' as const,
    title: title,
    features: features,
    improvements: [],
    bugfixes: [],
    breakingChanges: breaking
  })
};

/**
 * Quick helpers for common scenarios
 */
export async function logNewFeature(name: string, details: string[]) {
  return autoLogChanges(changelogTemplates.newFeature(name, details));
}

export async function logBugFix(description: string, fixes: string[]) {
  return autoLogChanges(changelogTemplates.bugFix(description, fixes));
}

export async function logImprovement(name: string, changes: string[]) {
  return autoLogChanges(changelogTemplates.improvement(name, changes));
}

/**
 * Smart changelog generator that analyzes the current session
 * This should be called at the end of development sessions
 */
export async function generateSessionChangelog() {
  // This is the intelligent auto-generator for today's session
  return autoLogChanges({
    type: 'minor',
    title: 'Real-time System Monitoring & Automatic Changelog',
    description: 'Implemented comprehensive real-time tracking system with AI usage monitoring, activity logging, automatic changelog generation, and enhanced system analytics',
    features: [
      '🤖 Real-time AI API call tracking with usage metrics and response time monitoring',
      '💾 Automatic activity logging for database backup operations',
      '📊 Intelligent database size estimation and monitoring',
      '🔄 Auto-refresh system metrics every 30 seconds',
      '📝 Automatic changelog generation system with one-click button',
      '🎯 Smart version auto-incrementing following semantic versioning',
      '📈 Enhanced System Overview dashboard with live metrics'
    ],
    improvements: [
      '✨ Improved text contrast in update status badges for better visibility',
      '⚡ Optimized database queries for better performance',
      '🎨 Enhanced UI visibility across all system components',
      '📊 Real-time metric updates without page refresh',
      '🔍 Better error tracking and monitoring capabilities',
      '📱 Responsive design improvements for all devices'
    ],
    bugfixes: [
      '🔧 Fixed TypeScript path alias configuration (@/* imports)',
      '🐛 Resolved module resolution issues for system components',
      '🎨 Fixed white text on white background in update badges',
      '📦 Fixed AI usage metrics not displaying in real-time',
      '📝 Fixed backup activity logs not being recorded properly',
      '💾 Corrected database size estimation formula'
    ]
  });
}
