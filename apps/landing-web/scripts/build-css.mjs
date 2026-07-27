import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const fontFiles = [
  'inter-latin-wght-normal.woff2',
  'ibm-plex-mono-latin-400-normal.woff2',
  'ibm-plex-mono-latin-700-normal.woff2',
];

const sourceDirectories = {
  'inter-latin-wght-normal.woff2': '@fontsource-variable/inter/files',
  'ibm-plex-mono-latin-400-normal.woff2': '@fontsource/ibm-plex-mono/files',
  'ibm-plex-mono-latin-700-normal.woff2': '@fontsource/ibm-plex-mono/files',
};

await Promise.all(
  fontFiles.map(async (fontFile) => {
    const destination = resolve(appRoot, 'public/fonts', fontFile);
    const source = resolve(
      appRoot,
      '../../node_modules',
      sourceDirectories[fontFile],
      fontFile,
    );

    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }),
);
