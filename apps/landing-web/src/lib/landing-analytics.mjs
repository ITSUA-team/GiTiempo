export const ANALYTICS_CONSENT_STORAGE_KEY = 'gitiempo.landing.analytics-consent.v1';

const ALLOWED_CAMPAIGN_PARAMETERS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'dclid',
  'gbraid',
  'wbraid',
];

const DENIED_CONSENT = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

function getStorage(windowObject) {
  try {
    return windowObject.localStorage;
  } catch {
    return null;
  }
}

function getGtag(windowObject) {
  windowObject.dataLayer = windowObject.dataLayer || [];
  windowObject.gtag = windowObject.gtag || function gtag() {
    windowObject.dataLayer.push(arguments);
  };

  return windowObject.gtag;
}

function deleteAnalyticsCookies(documentObject, windowObject) {
  const cookieNames = documentObject.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('=')[0])
    .filter((name) => /^_(?:ga|gcl)(?:_|$)/i.test(name));

  const hostnameParts = windowObject.location.hostname.split('.');
  const domains = hostnameParts.map((_, index) => hostnameParts.slice(index).join('.'));

  for (const name of cookieNames) {
    const encodedName = encodeURIComponent(name);
    documentObject.cookie = `${encodedName}=; Max-Age=0; Path=/; SameSite=Lax`;

    for (const domain of domains) {
      documentObject.cookie = `${encodedName}=; Max-Age=0; Path=/; Domain=.${domain}; SameSite=Lax`;
    }
  }
}

function loadGoogleTag(documentObject, measurementId) {
  if (documentObject.querySelector('script[data-gitiempo-ga4]')) return;

  const script = documentObject.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.gitiempoGa4 = 'true';
  documentObject.head.append(script);
}

export function getStoredAnalyticsConsent(windowObject) {
  let storedValue;

  try {
    storedValue = getStorage(windowObject)?.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }

  return storedValue === 'granted' || storedValue === 'denied' ? storedValue : null;
}

export function setStoredAnalyticsConsent(windowObject, consent) {
  try {
    getStorage(windowObject)?.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
  } catch {
    // Analytics remains optional when local storage is unavailable.
  }
}

export function sanitizePageLocation(locationObject) {
  const sourceUrl = new URL(locationObject.href);
  const sanitizedUrl = new URL(sourceUrl.origin + sourceUrl.pathname);

  for (const parameter of ALLOWED_CAMPAIGN_PARAMETERS) {
    for (const value of sourceUrl.searchParams.getAll(parameter)) {
      sanitizedUrl.searchParams.append(parameter, value);
    }
  }

  return sanitizedUrl.href;
}

export function initializeLandingAnalytics({ documentObject = document, windowObject = window, root, measurementId }) {
  const status = root.querySelector('[data-analytics-consent-status]');
  const allowButton = root.querySelector('[data-analytics-consent="grant"]');
  const declineButton = root.querySelector('[data-analytics-consent="deny"]');
  const settingsButtons = documentObject.querySelectorAll('[data-analytics-settings]');
  let analyticsActive = false;
  let configured = false;
  let pageViewSent = false;

  const gtag = getGtag(windowObject);
  gtag('consent', 'default', DENIED_CONSENT);

  function renderConsentPrompt(consent) {
    root.hidden = false;
    root.dataset.analyticsConsent = consent || 'unset';
    status.textContent = consent === 'granted'
      ? 'Analytics is currently enabled. You can withdraw your consent at any time.'
      : consent === 'denied'
        ? 'Analytics is currently disabled. You can enable it at any time.'
        : 'Choose whether to allow anonymous landing analytics.';
    allowButton.textContent = consent === 'granted' ? 'Keep analytics enabled' : 'Allow analytics';
    declineButton.textContent = consent === 'denied' ? 'Keep analytics disabled' : 'Decline';
  }

  function configureGoogleTag() {
    if (configured) return;

    configured = true;
    gtag('js', new Date());
    gtag('config', measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    // The GA4 stream must also have Enhanced Measurement and automatic event
    // detection disabled; those stream-side settings cannot be overridden here.
    loadGoogleTag(documentObject, measurementId);
  }

  function sendPageView() {
    if (pageViewSent) return;

    pageViewSent = true;
    gtag('event', 'page_view', {
      page_title: documentObject.title,
      page_location: sanitizePageLocation(windowObject.location),
    });
  }

  function enableAnalytics() {
    analyticsActive = true;
    gtag('consent', 'update', {
      ...DENIED_CONSENT,
      analytics_storage: 'granted',
    });
    configureGoogleTag();
    sendPageView();
  }

  function disableAnalytics() {
    analyticsActive = false;
    gtag('consent', 'update', DENIED_CONSENT);
    deleteAnalyticsCookies(documentObject, windowObject);
  }

  function saveConsent(consent) {
    setStoredAnalyticsConsent(windowObject, consent);

    if (consent === 'granted') {
      enableAnalytics();
    } else {
      disableAnalytics();
    }

    root.hidden = true;
  }

  allowButton.addEventListener('click', () => saveConsent('granted'));
  declineButton.addEventListener('click', () => saveConsent('denied'));

  for (const settingsButton of settingsButtons) {
    settingsButton.addEventListener('click', () => renderConsentPrompt(getStoredAnalyticsConsent(windowObject)));
  }

  documentObject.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-analytics-cta]') : null;

    if (!analyticsActive || !target) return;

    gtag('event', 'landing_cta_click', {
      cta_location: target.dataset.analyticsCta,
      destination_app: target.dataset.analyticsDestination,
    });
  });

  const storedConsent = getStoredAnalyticsConsent(windowObject);
  if (storedConsent === 'granted') {
    enableAnalytics();
  } else if (storedConsent === 'denied') {
    disableAnalytics();
  } else {
    renderConsentPrompt(null);
  }
}
