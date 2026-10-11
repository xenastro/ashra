import { useState } from 'react';
import { currentLanguage, savedParentLanguage, saveParentLanguage, setLocale, t } from './i18n';
import { isStandalone, promptInstall, thisDevice, useCanPrompt, useJustInstalled, type Browser, type Platform } from './homeScreen';
import { goBack } from './router';

export const INSTALL_PATH = '/install';

type Glyph = 'share' | 'more' | 'menu' | 'lines' | 'add' | 'done';

/** The buttons the steps refer to, drawn the way the phone shows them. */
function StepIcon({ glyph }: { glyph: Glyph }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <span className="step-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22">
        {glyph === 'share' && (
          <g {...common}>
            <path d="M12 3v12M8 7l4-4 4 4" />
            <path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16" />
          </g>
        )}
        {glyph === 'more' && (
          <g fill="currentColor">
            <circle cx="5.5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="18.5" cy="12" r="1.8" />
          </g>
        )}
        {glyph === 'menu' && (
          <g fill="currentColor">
            <circle cx="12" cy="5.5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="18.5" r="1.8" />
          </g>
        )}
        {glyph === 'lines' && <path {...common} d="M4 7h16M4 12h16M4 17h16" />}
        {glyph === 'add' && (
          <g {...common}>
            <rect x="4" y="4" width="16" height="16" rx="4" />
            <path d="M12 8.5v7M8.5 12h7" />
          </g>
        )}
        {glyph === 'done' && <path {...common} d="M5 12.5l4.5 4.5L19 7.5" />}
      </svg>
    </span>
  );
}

function Steps({ steps }: { steps: [Glyph, string][] }) {
  return (
    <ol className="install-steps">
      {steps.map(([glyph, key]) => (
        <li key={key}>
          <StepIcon glyph={glyph} />
          <span>{t(key)}</span>
        </li>
      ))}
    </ol>
  );
}

function CopyLink() {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${INSTALL_PATH}`;
  return (
    <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
      <button
        className="btn btn-soft"
        onClick={() =>
          void navigator.clipboard?.writeText(url).then(
            () => setCopied(true),
            () => undefined,
          )
        }
      >
        {copied ? `✓ ${t('install.copied')}` : t('install.copy')}
      </button>
      <span className="muted small" dir="ltr" style={{ overflowWrap: 'anywhere' }}>
        {url}
      </span>
    </div>
  );
}

/** A browser inside another app can't install: send them to the phone's own browser first. */
function OpenInBrowser({ platform }: { platform: Platform }) {
  return (
    <section className="card stack">
      <h2>{t('install.inAppTitle')}</h2>
      <p>{t(platform === 'ios' ? 'install.inAppIos' : 'install.inAppAndroid')}</p>
      <CopyLink />
    </section>
  );
}

function AndroidGuide({ browser, here }: { browser: Browser; here: boolean }) {
  const canPrompt = useCanPrompt();
  const justInstalled = useJustInstalled();
  const [outcome, setOutcome] = useState<string | null>(null);

  if (justInstalled || outcome === 'accepted') return <p className="banner" role="status">{t('install.done')}</p>;
  if (here && browser === 'inapp') return <OpenInBrowser platform="android" />;
  const samsung = here && browser === 'samsung';

  return (
    <>
      {here && canPrompt && (
        <section className="card stack">
          <button className="btn btn-primary btn-big" onClick={() => void promptInstall().then(setOutcome)}>
            {t('install.installButton')}
          </button>
          <p className="muted small">{t('install.installNote')}</p>
        </section>
      )}
      <section className="card stack">
        <h2>{t(here && canPrompt ? 'install.orMenu' : samsung ? 'install.samsungTitle' : 'install.chromeTitle')}</h2>
        {here && browser === 'other' && <p className="muted small">{t('install.useChrome')}</p>}
        {samsung ? (
          <Steps
            steps={[
              ['lines', 'install.samsung1'],
              ['add', 'install.samsung2'],
              ['done', 'install.samsung3'],
            ]}
          />
        ) : (
          <Steps
            steps={[
              ['menu', 'install.chrome1'],
              ['add', 'install.chrome2'],
              ['done', 'install.chrome3'],
            ]}
          />
        )}
      </section>
    </>
  );
}

function IosGuide({ browser, here }: { browser: Browser; here: boolean }) {
  if (here && browser === 'inapp') return <OpenInBrowser platform="ios" />;
  if (here && browser === 'chrome')
    return (
      <section className="card stack">
        <h2>{t('install.iosChromeTitle')}</h2>
        <Steps
          steps={[
            ['share', 'install.iosChrome1'],
            ['add', 'install.iosChrome2'],
            ['done', 'install.iosChrome3'],
          ]}
        />
      </section>
    );
  return (
    <section className="card stack">
      <h2>{t('install.safariTitle')}</h2>
      {here && browser === 'other' && <p className="muted small">{t('install.useSafari')}</p>}
      <Steps
        steps={[
          ['more', 'install.safari1'],
          ['share', 'install.safari2'],
          ['add', 'install.safari3'],
          ['done', 'install.safari4'],
        ]}
      />
      <p className="muted small">{t('install.safariTip')}</p>
    </section>
  );
}

/** /install: how to put Ashra on the home screen, for the phone it's opened on. */
export function Install() {
  // Arriving from a screen inside the app keeps that screen's language (a child's may differ).
  const [lang, setLang] = useState(() => (window.history.state ? currentLanguage() : savedParentLanguage()));
  setLocale(lang);
  const device = thisDevice();
  const [tab, setTab] = useState<Platform>(device.platform === 'ios' ? 'ios' : 'android');
  const here = tab === device.platform;

  return (
    <main className="screen install">
      <header className="row spread">
        <div className="row">
          <button className="icon-btn" aria-label={t('common.back')} onClick={() => goBack('/')}>
            <span className="flip-rtl">←</span>
          </button>
          <h1 style={{ fontSize: '1.4rem' }}>{t('install.title')}</h1>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => {
            const next = lang === 'ar' ? 'en' : 'ar';
            saveParentLanguage(next);
            setLang(next);
          }}
        >
          {t('parent.langSwitch')}
        </button>
      </header>
      {isStandalone() ? (
        <p className="banner" role="status">
          {t('install.already')}
        </p>
      ) : (
        <>
          <p className="muted">{t('install.intro')}</p>
          <div className="segmented" role="group" aria-label={t('install.which')}>
            <button className="chip" aria-pressed={tab === 'ios'} onClick={() => setTab('ios')}>
              {t('install.iphone')}
            </button>
            <button className="chip" aria-pressed={tab === 'android'} onClick={() => setTab('android')}>
              {t('install.android')}
            </button>
          </div>
          {device.platform === 'other' && <p className="muted small">{t('install.onComputer')}</p>}
          {tab === 'ios' ? <IosGuide browser={device.browser} here={here} /> : <AndroidGuide browser={device.browser} here={here} />}
          {device.platform === 'other' && <CopyLink />}
        </>
      )}
    </main>
  );
}
