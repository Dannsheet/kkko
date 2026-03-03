/* global process */

export default async function handler(req, res) {
  try {
    if (req.method && req.method.toUpperCase() !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const apiKey = process.env.PEXELS_API_KEY || process.env.VITE_PEXELS_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Missing PEXELS_API_KEY' });
      return;
    }

    const { per_page = '10', page = '1' } = req.query || {};

    const url = new URL('https://api.pexels.com/videos/popular');
    url.searchParams.set('per_page', String(per_page));
    url.searchParams.set('page', String(page));

    const upstream = await fetch(url.toString(), {
      headers: {
        Authorization: apiKey,
        Accept: 'application/json',
        'Accept-Encoding': 'identity',
        'User-Agent': 'dojaweb-vercel-proxy',
      },
      cache: 'no-store',
    });

    const text = await upstream.text();

    res.status(upstream.status);
    res.setHeader('content-type', 'application/json');
    res.send(text);
  } catch (err) {
    res.status(502).json({ error: 'Pexels request failed', message: err?.message });
  }
}
