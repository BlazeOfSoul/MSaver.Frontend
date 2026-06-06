import { RenderMode } from '@angular/ssr';
import { serverRoutes } from './app.routes.server';

describe('serverRoutes', () => {
    it('renders routes on the client because auth state lives in browser storage', () => {
        expect(serverRoutes).toEqual([
            {
                path: '**',
                renderMode: RenderMode.Client,
            },
        ]);
    });
});
