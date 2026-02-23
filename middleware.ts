/**
 * Vercel Edge Middleware — blocks bot/crawler traffic from API routes.
 * /favico/* is in the matcher solely so social preview bots bypass
 * Vercel Attack Challenge; all /favico requests pass through unblocked.
 * Social preview bots are also allowed on /api/story and /api/og-story.
 */

const BOT_UA =
  /bot|crawl|spider|slurp|archiver|wget|curl\/|python-requests|scrapy|httpclient|go-http|java\/|libwww|perl|ruby|php\/|ahrefsbot|semrushbot|mj12bot|dotbot|baiduspider|yandexbot|sogou|bytespider|petalbot|gptbot|claudebot|ccbot/i;

const SOCIAL_PREVIEW_UA =
  /twitterbot|facebookexternalhit|linkedinbot|slackbot|telegrambot|whatsapp|discordbot|redditbot/i;

const SOCIAL_PREVIEW_PATHS = new Set(['/api/story', '/api/og-story']);

export default function middleware(request: Request) {
  const ua = request.headers.get('user-agent') ?? '';
  const url = new URL(request.url);
  const path = url.pathname;

  // /favico/* assets are public — only in matcher so social bots bypass Vercel Attack Challenge.
  // Never apply bot-deny or short-UA blocking to static favicon/OG assets.
  if (path.startsWith('/favico/')) {
    return;
  }

  // Allow social preview bots on exact OG routes only
  if (SOCIAL_PREVIEW_UA.test(ua) && SOCIAL_PREVIEW_PATHS.has(path)) {
    return;
  }

  // Block bots from all API routes
  if (BOT_UA.test(ua)) {
    return new Response('{"error":"Forbidden"}', {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // No user-agent or suspiciously short — likely a script
  if (!ua || ua.length < 10) {
    return new Response('{"error":"Forbidden"}', {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const config = {
  matcher: ['/api/:path*', '/favico/:path*'],
};
