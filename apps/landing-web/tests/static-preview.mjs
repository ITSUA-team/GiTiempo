import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDirectory = fileURLToPath(new URL('../dist/', import.meta.url));
const distPrefix = distDirectory.endsWith(sep) ? distDirectory : `${distDirectory}${sep}`;
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

function respondNotFound(response) {
  response.writeHead(404);
  response.end();
}

export async function startStaticPreview() {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url, 'http://127.0.0.1');
      const relativePath = requestUrl.pathname === '/' ? 'index.html' : decodeURIComponent(requestUrl.pathname.slice(1));
      const filePath = resolve(distDirectory, relativePath);

      if (!filePath.startsWith(distPrefix)) {
        respondNotFound(response);
        return;
      }

      const body = await readFile(filePath);
      response.writeHead(200, {
        'content-type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
      });
      response.end(body);
    } catch {
      respondNotFound(response);
    }
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    await new Promise((resolveClose) => server.close(resolveClose));
    throw new Error('Static preview did not bind to a TCP port.');
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close((error) => (error ? rejectClose(error) : resolveClose()));
    }),
  };
}
