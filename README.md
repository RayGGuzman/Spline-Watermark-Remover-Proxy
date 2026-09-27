# Spline Watermark Remover Proxy

A small Node.js proxy that serves Spline pages through your domain and removes links matching `a.spline-watermark` from the page.

## How it works

A request to `https://your-domain.com/<scene-id>/` fetches `https://my.spline.design/<scene-id>/`. The proxy removes matching links from the initial HTML, adds a script that removes matching links inserted later, and sends the result to the browser. A `<base>` element resolves relative assets against the original Spline URL.

## Requirements

- Node.js 18 or later
- Permission to modify and serve the Spline scene in this way

No npm packages are required.

## Use the public instance

No installation is needed. Replace `<scene-id>` with the ID from a `my.spline.design` scene URL:

```text
https://spline-watermark-remover-proxy.vercel.app/<scene-id>/
```

For example:

```html
<iframe
  src="https://spline-watermark-remover-proxy.vercel.app/bottleformk-yWqn31I0ZNJOcWn2zV9jCNo8/"
  width="100%"
  height="100%"
  style="border: 0"
  title="Interactive 3D scene"
></iframe>
```

The public instance depends on the operator keeping that Vercel deployment online. Use this option if you are comfortable having the proxy fetch your public scene through that deployment.

## Self host

Clone or download this repository and deploy it on your own infrastructure. No npm packages are required.

### Vercel

Import the repository as a Vercel project. Set **Framework Preset** to **Other** and leave **Root Directory** at the repository root. The included `api/proxy.js` and `vercel.json` handle the function and friendly scene URLs. No build command or environment variables are required.

Your scene URL will be:

```text
https://your-project.vercel.app/<scene-id>/
```

### Node.js server

With Node.js 18 or later:

```bash
node server.js
```

The server listens on port `3000` by default. Set `PORT` to change it:

```bash
PORT=8080 node server.js
```

Open `http://localhost:3000/bottleformk-yWqn31I0ZNJOcWn2zV9jCNo8/` to try a scene. For a public deployment, forward your domain to the Node.js server over HTTPS and use `https://your-domain.com/<scene-id>/` as the iframe source.

## Removal behavior

`server.js` removes `a.spline-watermark` links found in the upstream HTML. Its injected `MutationObserver` also removes matching links added to the document later by JavaScript. The selector is defined in `removeWatermarkScript`; change it there if the upstream markup changes.

This approach relies on the element existing in the iframe document's ordinary DOM. It cannot reach into a cross-origin nested iframe or a closed shadow root. Some resources still load directly from Spline.

## Configuration

| Setting | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Listening port; configurable through an environment variable. |
| `SPLINE_ORIGIN` | `https://my.spline.design` | Upstream origin; edit the constant in `server.js`. |
| `REQUEST_TIMEOUT_MS` | `15000` | Upstream timeout; edit the constant in `server.js`. |
| `MAX_HTML_BYTES` | `5242880` | Maximum HTML size; edit the constant in `server.js`. |

## Notes

- The proxy accepts scene IDs instead of arbitrary URLs so it cannot be used to fetch unrelated hosts.
- Spline may change its HTML or JavaScript behavior, requiring updates to the selector or proxy.
- This is an independent project and is not affiliated with Spline. Check your Spline plan and terms before using watermark removal.
