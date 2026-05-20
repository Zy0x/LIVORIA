export interface Env {
  NETLIFY_ORIGIN?: string;
}

const DEFAULT_ORIGIN = "https://livoria.netlify.app";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.NETLIFY_ORIGIN || DEFAULT_ORIGIN;
    const source = new URL(request.url);
    const target = new URL(source.pathname + source.search, origin);
    const headers = new Headers(request.headers);
    headers.delete('host');

    const init: RequestInit = {
      headers,
      method: request.method,
      redirect: 'manual',
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body;
    }

    return fetch(new Request(target, init));
  },
};
