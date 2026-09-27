const http = require('node:http');

const PORT = Number(process.env.PORT || 3000);
const SPLINE_ORIGIN = 'https://my.spline.design';
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 5 * 1024 * 1024;

const removeWatermarkScript = `
<script>
(() => {
  const selector = 'a.spline-watermark';
  const removeWatermarks = () => {
    document.querySelectorAll(selector).forEach((element) => element.remove());
  };

  removeWatermarks();

  const observer = new MutationObserver(removeWatermarks);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
})();
</script>`;

function transformHtml(html, sceneUrl) {
  const baseTag = `<base href="${sceneUrl}">`;
  let result = html;

  if (/<head(?:\s[^>]*)?>/i.test(result)) {
    result = result.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  } else {
    result = `${baseTag}${result}`;
  }

  // Remove watermark links already present in the upstream HTML.
  result = result.replace(
    /<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bspline-watermark\b[^"']*["'])[^>]*>[\s\S]*?<\/a\s*>/gi,
    ''
  );

  // Remove watermark links added later by client-side JavaScript.
  if (/<\/body\s*>/i.test(result)) {
    result = result.replace(/<\/body\s*>/i, `${removeWatermarkScript}</body>`);
  } else {
    result += removeWatermarkScript;
  }

  return result;
}

function sendText(res, status, message) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(message);
}

async function handleRequest(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendText(res, 405, 'Method not allowed');
  }

  const pathname = new URL(req.url, 'http://localhost').pathname;
  const match = pathname.match(/^\/([a-zA-Z0-9_-]+)\/?$/);

  if (!match) return sendText(res, 404, 'Scene not found');

  const sceneUrl = `${SPLINE_ORIGIN}/${match[1]}/`;

  try {
    const upstream = await fetch(sceneUrl, {
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Accept: 'text/html' },
    });

    if (!upstream.ok) {
      return sendText(res, 502, `Spline returned HTTP ${upstream.status}`);
    }

    if (!(upstream.headers.get('content-type') || '').toLowerCase().includes('text/html')) {
      return sendText(res, 502, 'Spline did not return HTML');
    }

    const declaredLength = Number(upstream.headers.get('content-length'));
    if (declaredLength > MAX_HTML_BYTES) {
      return sendText(res, 502, 'Spline response is too large');
    }

    let size = 0;
    const chunks = [];

    for await (const chunk of upstream.body) {
      size += chunk.length;
      if (size > MAX_HTML_BYTES) {
        return sendText(res, 502, 'Spline response is too large');
      }
      chunks.push(chunk);
    }

    const html = transformHtml(Buffer.concat(chunks).toString('utf8'), sceneUrl);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    });
    res.end(html);
  } catch (error) {
    console.error('Failed to load Spline scene:', error);
    sendText(res, 502, 'Unable to load Spline scene');
  }
}

if (require.main === module) {
  http.createServer(handleRequest).listen(PORT, () => {
    console.log(`Spline proxy listening on port ${PORT}`);
  });
}

module.exports = { transformHtml, handleRequest };
