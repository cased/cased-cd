import { AnyRouter } from '../router.js';
import { DehydratedMatch } from './ssr-client.js';
import { AnyRouteMatch } from '../Matches.js';
import { Manifest } from '../manifest.js';
declare module '../router' {
    interface ServerSsr {
        setRenderFinished: () => void;
    }
    interface RouterEvents {
        onInjectedHtml: {
            type: 'onInjectedHtml';
            promise: Promise<string>;
        };
    }
}
export declare function dehydrateMatch(match: AnyRouteMatch): DehydratedMatch;
export declare function attachRouterServerSsrUtils({ router, manifest, }: {
    router: AnyRouter;
    manifest: Manifest | undefined;
}): void;
export declare function getOrigin(request: Request): string;
