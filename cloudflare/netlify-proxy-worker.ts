export interface Env {
  NETLIFY_ORIGIN?: string;
}

const DEFAULT_ORIGIN = "https://livoria.netlify.app";
const FORWARDED_HEADER_ALLOWLIST = [
  'accept',
  'accept-language',
  'authorization',
  'content-type',
  'cookie',
  'user-agent',
] as const;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.NETLIFY_ORIGIN || DEFAULT_ORIGIN;
    const source = new URL(request.url);
    const target = new URL(source.pathname + source.search, origin);
    const isPwaCriticalAsset = ['/sw.js', '/pwa-bootstrap.js', '/version.json', '/manifest.json'].includes(source.pathname);
    const headers = new Headers();

    for (const name of FORWARDED_HEADER_ALLOWLIST) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }

    headers.set('x-forwarded-host', source.host);
    headers.set('x-forwarded-proto', source.protocol.replace(':', ''));

    const init: RequestInit = {
      headers,
      method: request.method,
      redirect: 'manual',
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body;
    }

    const response = await fetch(new Request(target, init));
    if (!isPwaCriticalAsset) return response;

    const nextHeaders = new Headers(response.headers);
    nextHeaders.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    nextHeaders.set('CDN-Cache-Control', 'no-store');
    nextHeaders.set('Cloudflare-CDN-Cache-Control', 'no-store');
    nextHeaders.set('X-Livoria-PWA-Proxy', 'bypass');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: nextHeaders,
    });
  },
};
