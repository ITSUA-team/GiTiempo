const URL_NAMES = {
  PUBLIC_SITE_URL: 'PUBLIC_SITE_URL',
  PUBLIC_USER_APP_URL: 'PUBLIC_USER_APP_URL',
  PUBLIC_ADMIN_APP_URL: 'PUBLIC_ADMIN_APP_URL',
};

const MEASUREMENT_ID_NAME = 'PUBLIC_GA_MEASUREMENT_ID';
const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,}$/;
const PRIVACY_CONTROLLER_NAME = 'PUBLIC_PRIVACY_CONTROLLER_NAME';
const PRIVACY_CONTACT_EMAIL = 'PUBLIC_PRIVACY_CONTACT_EMAIL';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function parseRequiredText(name, value) {
  const text = value?.trim();

  if (!text) {
    throw new Error(`${name} is required.`);
  }

  return text;
}

function parseEmail(name, value) {
  const email = parseRequiredText(name, value);

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error(`${name} must be a valid email address.`);
  }

  return email;
}

export function getPublicConfig(environment) {
  const measurementId = environment.PUBLIC_GA_MEASUREMENT_ID?.trim();

  if (measurementId && !MEASUREMENT_ID_PATTERN.test(measurementId)) {
    throw new Error(`${MEASUREMENT_ID_NAME} must be a valid GA4 Measurement ID.`);
  }

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
    analyticsMeasurementId: measurementId || undefined,
    privacyControllerName: parseRequiredText(
      PRIVACY_CONTROLLER_NAME,
      environment.PUBLIC_PRIVACY_CONTROLLER_NAME,
    ),
    privacyContactEmail: parseEmail(
      PRIVACY_CONTACT_EMAIL,
      environment.PUBLIC_PRIVACY_CONTACT_EMAIL,
    ),
  };
}
