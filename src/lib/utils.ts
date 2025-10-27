import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a repository URL and format it for display
 * For GitHub URLs, returns org/repo format
 * For other URLs, returns the full URL
 */
export function formatRepoUrl(repoUrl: string): {
  isGithub: boolean
  displayText: string
  fullUrl: string
} {
  try {
    // Handle both HTTPS and SSH GitHub URLs
    const githubHttpsMatch = repoUrl.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/\.]+?)(?:\.git)?$/i)
    const githubSshMatch = repoUrl.match(/git@github\.com:([^/]+)\/([^/\.]+?)(?:\.git)?$/i)

    if (githubHttpsMatch) {
      const org = githubHttpsMatch[1]
      const repo = githubHttpsMatch[2]
      return {
        isGithub: true,
        displayText: `${org}/${repo}`,
        fullUrl: repoUrl
      }
    }

    if (githubSshMatch) {
      const org = githubSshMatch[1]
      const repo = githubSshMatch[2]
      return {
        isGithub: true,
        displayText: `${org}/${repo}`,
        fullUrl: repoUrl
      }
    }

    // Not a GitHub URL, return as-is
    return {
      isGithub: false,
      displayText: repoUrl,
      fullUrl: repoUrl
    }
  } catch {
    // If parsing fails, return the original URL
    return {
      isGithub: false,
      displayText: repoUrl,
      fullUrl: repoUrl
    }
  }
}
