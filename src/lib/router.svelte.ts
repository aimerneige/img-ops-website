export type Route = 'collage' | 'stitch' | 'split';
export const ROUTES: Route[] = ['collage', 'stitch', 'split'];

function read(): Route {
  const r = location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(r) ? r : 'collage';
}

class Router {
  route = $state<Route>(read());
  constructor() {
    window.addEventListener('hashchange', () => (this.route = read()));
  }
  go(r: Route) {
    location.hash = `/${r}`;
  }
}
export const router = new Router();
