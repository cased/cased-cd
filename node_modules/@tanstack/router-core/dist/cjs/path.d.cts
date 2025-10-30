import { LRUCache } from './lru-cache.cjs';
import { MatchLocation } from './RouterProvider.cjs';
import { AnyPathParams } from './route.cjs';
export declare const SEGMENT_TYPE_PATHNAME = 0;
export declare const SEGMENT_TYPE_PARAM = 1;
export declare const SEGMENT_TYPE_WILDCARD = 2;
export declare const SEGMENT_TYPE_OPTIONAL_PARAM = 3;
export interface Segment {
    readonly type: typeof SEGMENT_TYPE_PATHNAME | typeof SEGMENT_TYPE_PARAM | typeof SEGMENT_TYPE_WILDCARD | typeof SEGMENT_TYPE_OPTIONAL_PARAM;
    readonly value: string;
    readonly prefixSegment?: string;
    readonly suffixSegment?: string;
    readonly hasStaticAfter?: boolean;
}
/** Join path segments, cleaning duplicate slashes between parts. */
export declare function joinPaths(paths: Array<string | undefined>): string;
/** Remove repeated slashes from a path string. */
export declare function cleanPath(path: string): string;
/** Trim leading slashes (except preserving root '/'). */
export declare function trimPathLeft(path: string): string;
/** Trim trailing slashes (except preserving root '/'). */
export declare function trimPathRight(path: string): string;
/** Trim both leading and trailing slashes. */
export declare function trimPath(path: string): string;
/** Remove a trailing slash from value when appropriate for comparisons. */
export declare function removeTrailingSlash(value: string, basepath: string): string;
/**
 * Compare two pathnames for exact equality after normalizing trailing slashes
 * relative to the provided `basepath`.
 */
export declare function exactPathTest(pathName1: string, pathName2: string, basepath: string): boolean;
interface ResolvePathOptions {
    base: string;
    to: string;
    trailingSlash?: 'always' | 'never' | 'preserve';
    parseCache?: ParsePathnameCache;
}
/**
 * Resolve a destination path against a base, honoring trailing-slash policy
 * and supporting relative segments (`.`/`..`) and absolute `to` values.
 */
export declare function resolvePath({ base, to, trailingSlash, parseCache, }: ResolvePathOptions): string;
export type ParsePathnameCache = LRUCache<string, ReadonlyArray<Segment>>;
/**
 * Parse a pathname into an array of typed segments used by the router's
 * matcher. Results are optionally cached via an LRU cache.
 */
export declare const parsePathname: (pathname?: string, cache?: ParsePathnameCache) => ReadonlyArray<Segment>;
interface InterpolatePathOptions {
    path?: string;
    params: Record<string, unknown>;
    leaveWildcards?: boolean;
    leaveParams?: boolean;
    decodeCharMap?: Map<string, string>;
    parseCache?: ParsePathnameCache;
}
type InterPolatePathResult = {
    interpolatedPath: string;
    usedParams: Record<string, unknown>;
    isMissingParams: boolean;
};
/**
 * Interpolate params and wildcards into a route path template.
 *
 * - Encodes params safely (configurable allowed characters)
 * - Supports `{-$optional}` segments, `{prefix{$id}suffix}` and `{$}` wildcards
 * - Optionally leaves placeholders or wildcards in place
 */
export declare function interpolatePath({ path, params, leaveWildcards, leaveParams, decodeCharMap, parseCache, }: InterpolatePathOptions): InterPolatePathResult;
/**
 * Match a pathname against a route destination and return extracted params
 * or `undefined`. Uses the same parsing as the router for consistency.
 */
export declare function matchPathname(currentPathname: string, matchLocation: Pick<MatchLocation, 'to' | 'fuzzy' | 'caseSensitive'>, parseCache?: ParsePathnameCache): AnyPathParams | undefined;
/** Low-level matcher that compares two path strings and extracts params. */
export declare function matchByPath(from: string, { to, fuzzy, caseSensitive, }: Pick<MatchLocation, 'to' | 'caseSensitive' | 'fuzzy'>, parseCache?: ParsePathnameCache): Record<string, string> | undefined;
export {};
