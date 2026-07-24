const URL_NAMES = {
  PUBLIC_SITE_URL: 'PUBLIC_SITE_URL',
  PUBLIC_USER_APP_URL: 'PUBLIC_USER_APP_URL',
  PUBLIC_ADMIN_APP_URL: 'PUBLIC_ADMIN_APP_URL',
};

function parseUrl(name, value, { originOnly = false } = {}) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${name} must use http or https.`);
  }

  if (originOnly && (url.pathname !== '/' || url.search || url.hash)) {
    throw new Error(`${name} must be an origin without a path, query, or hash.`);
  }

  return url.href;
}

export function getPublicConfig(environment) {
  return {
    siteUrl: parseUrl(URL_NAMES.PUBLIC_SITE_URL, environment.PUBLIC_SITE_URL, {
      originOnly: true,
    }),
    userAppUrl: parseUrl(
      URL_NAMES.PUBLIC_USER_APP_URL,
      environment.PUBLIC_USER_APP_URL,
    ),
    adminAppUrl: parseUrl(
      URL_NAMES.PUBLIC_ADMIN_APP_URL,
      environment.PUBLIC_ADMIN_APP_URL,
    ),
  };
}
