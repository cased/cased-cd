import { RouteLike } from './route.js';
export type ProcessRouteTreeResult<TRouteLike extends RouteLike> = {
    routesById: Record<string, TRouteLike>;
    routesByPath: Record<string, TRouteLike>;
    flatRoutes: Array<TRouteLike>;
};
/**
 * Build lookup maps and a specificity-sorted flat list from a route tree.
 * Returns `routesById`, `routesByPath`, and `flatRoutes`.
 */
/**
 * Build lookup maps and a specificity-sorted flat list from a route tree.
 * Returns `routesById`, `routesByPath`, and `flatRoutes`.
 */
export declare function processRouteTree<TRouteLike extends RouteLike>({ routeTree, initRoute, }: {
    routeTree: TRouteLike;
    initRoute?: (route: TRouteLike, index: number) => void;
}): ProcessRouteTreeResult<TRouteLike>;
