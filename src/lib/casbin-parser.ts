import type { CasbinPolicy, ParsedRBACConfig, PolicyType, PolicyEffect } from '@/types/api'

/**
 * Parse a Casbin policy.csv string into structured CasbinPolicy objects
 *
 * Policy format: p, subject, resource, action, object, effect
 * Group format: g, user/group, role
 *
 * @param policyCsv - Raw policy.csv content
 * @returns Parsed policies
 */
export function parseCasbinPolicies(policyCsv: string): CasbinPolicy[] {
  const policies: CasbinPolicy[] = []

  // Split by newlines and filter empty lines and comments
  const lines = policyCsv
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))

  for (const line of lines) {
    // Split by comma and trim whitespace
    const parts = line.split(',').map(p => p.trim())

    if (parts.length === 0) continue

    const type = parts[0] as PolicyType

    if (type === 'p') {
      // Policy: p, subject, resource, action, object, effect
      if (parts.length >= 6) {
        policies.push({
          type: 'p',
          subject: parts[1],
          resource: parts[2],
          action: parts[3],
          object: parts[4],
          effect: parts[5] as PolicyEffect,
        })
      }
    } else if (type === 'g') {
      // Group: g, user/group, role
      if (parts.length >= 3) {
        policies.push({
          type: 'g',
          subject: parts[1],
          role: parts[2],
        })
      }
    }
  }

  return policies
}

/**
 * Parse full RBAC config including policies and default policy
 * @param rbacConfig - Raw RBAC config from ConfigMap
 * @returns Parsed RBAC config
 */
export function parseRBACConfig(rbacConfig: { policy: string; policyDefault?: string }): ParsedRBACConfig {
  return {
    policies: parseCasbinPolicies(rbacConfig.policy),
    defaultPolicy: rbacConfig.policyDefault,
    raw: rbacConfig.policy,
  }
}

/**
 * Generate a Casbin policy string from a CasbinPolicy object
 * @param policy - Policy object
 * @returns Policy string (e.g., "p, user, applications, get, *, allow")
 */
export function generatePolicyString(policy: CasbinPolicy): string {
  if (policy.type === 'p') {
    return `p, ${policy.subject}, ${policy.resource}, ${policy.action}, ${policy.object}, ${policy.effect}`
  } else {
    return `g, ${policy.subject}, ${policy.role}`
  }
}

/**
 * Generate policy.csv content from array of policies
 * @param policies - Array of policy objects
 * @returns policy.csv string
 */
export function generatePolicyCsv(policies: CasbinPolicy[]): string {
  return policies.map(p => generatePolicyString(p)).join('\n')
}

/**
 * Filter policies for a specific subject (user/role)
 * @param policies - All policies
 * @param subject - Subject to filter by
 * @returns Policies for this subject
 */
export function getPoliciesForSubject(policies: CasbinPolicy[], subject: string): CasbinPolicy[] {
  return policies.filter(p => p.subject === subject && p.type === 'p')
}

/**
 * Get all unique subjects from policies
 * @param policies - All policies
 * @returns Array of unique subjects
 */
export function getUniqueSubjects(policies: CasbinPolicy[]): string[] {
  const subjects = new Set<string>()
  policies.forEach(p => {
    if (p.type === 'p') {
      subjects.add(p.subject)
    }
  })
  return Array.from(subjects).sort()
}

/**
 * Get role memberships for a subject
 * @param policies - All policies
 * @param subject - Subject to check
 * @returns Array of roles this subject belongs to
 */
export function getRolesForSubject(policies: CasbinPolicy[], subject: string): string[] {
  return policies
    .filter(p => p.type === 'g' && p.subject === subject)
    .map(p => p.role!)
}

/**
 * Check if a policy applies to a specific resource (app)
 * @param policy - Policy to check
 * @param project - Project name
 * @param app - App name
 * @returns True if policy applies
 */
export function policyMatchesApp(policy: CasbinPolicy, project: string, app: string): boolean {
  if (!policy.object) return false

  // Handle wildcards
  if (policy.object === '*/*') return true
  if (policy.object === `${project}/*`) return true
  if (policy.object === `${project}/${app}`) return true

  return false
}

/**
 * Get all policies that apply to a specific app
 * @param policies - All policies
 * @param project - Project name
 * @param app - App name
 * @returns Policies that apply to this app
 */
export function getPoliciesForApp(policies: CasbinPolicy[], project: string, app: string): CasbinPolicy[] {
  return policies.filter(p => p.type === 'p' && policyMatchesApp(p, project, app))
}
