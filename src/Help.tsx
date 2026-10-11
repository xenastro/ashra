import { useEffect, useState, type ReactNode } from 'react';
import { INTERVAL_DAYS } from './engine/mastery';
import { savedParentLanguage, saveParentLanguage, setLocale, t } from './i18n';
import { goBack, navigate } from './router';

const SECTIONS = ['facts', 'checkup', 'session', 'order', 'levels', 'speed', 'dashboard', 'games'] as const;
export type HelpSection = (typeof SECTIONS)[number];

export const HELP_PATH = '/how-it-works';

export function openHelp(section?: HelpSection) {
  navigate(section ? `${HELP_PATH}#${section}` : HELP_PATH);
}

/** Sums inside a sentence ("7 × 8", "×4", "? × 7 = 56"), in either set of digits. Arabic texts use a Latin "?" in sums: "؟" would turn the sum right to left. */
const SUM = /(?:[\d٠-٩?]+\s*)?×\s*[\d٠-٩?]+(?:\s*[×=]\s*[\d٠-٩?]+)*/g;

/** Sums stay left to right and on one line, even inside Arabic text. */
function withSums(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of line.matchAll(SUM)) {
    out.push(line.slice(last, m.index));
    out.push(
      <span key={m.index} className="sum" dir="ltr">
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  out.push(line.slice(last));
  return out;
}

/** One paragraph per line; consecutive lines starting with "• " become a list. */
export function HelpText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let items: string[] = [];
  const flush = () => {
    if (!items.length) return;
    blocks.push(
      <ul key={blocks.length}>
        {items.map((x, i) => (
          <li key={i}>{withSums(x)}</li>
        ))}
      </ul>,
    );
    items = [];
  };
  for (const line of text.split('\n')) {
    if (line.startsWith('• ')) items.push(line.slice(2));
    else {
      flush();
      blocks.push(<p key={blocks.length}>{withSums(line)}</p>);
    }
  }
  flush();
  return <>{blocks}</>;
}

/** Levels, their colour on the map, and when each is asked again (from the engine's own intervals). */
function LevelTable() {
  return (
    <table className="simple">
      <thead>
        <tr>
          <th>{t('help.thLevel')}</th>
          <th>{t('help.thNext')}</th>
        </tr>
      </thead>
      <tbody>
        {INTERVAL_DAYS.map((days, level) => (
          <tr key={level}>
            <td>
              <span className="swatch" style={{ background: `var(--lv${level})` }} aria-hidden="true" />
              {t(`help.level${level}`)}
            </td>
            <td>
              {level === 0
                ? t('help.nextNew')
                : days === 0
                  ? t('help.nextSession')
                  : days === 1
                    ? t('help.nextDay')
                    : t('help.nextDays', { n: days })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** /how-it-works: how the app picks questions and moves facts along, for parents. */
export function Help() {
  const [lang, setLang] = useState(savedParentLanguage);
  setLocale(lang);

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="screen help">
      <header className="row spread">
        <div className="row">
          <button className="icon-btn" aria-label={t('common.back')} onClick={() => goBack('/parent')}>
            <span className="flip-rtl">←</span>
          </button>
          <h1 style={{ fontSize: '1.4rem' }}>{t('help.title')}</h1>
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
      <p className="muted">{withSums(t('help.intro'))}</p>
      <nav className="help-contents" aria-label={t('help.contents')}>
        {SECTIONS.map((s) => (
          <a key={s} href={`#${s}`}>
            {t(`help.${s}Title`)}
          </a>
        ))}
      </nav>
      {SECTIONS.map((s) => (
        <section key={s} id={s} className="card stack">
          <h2>{t(`help.${s}Title`)}</h2>
          <HelpText text={t(`help.${s}`)} />
          {s === 'levels' && (
            <>
              <LevelTable />
              <HelpText text={t('help.levelsMore')} />
            </>
          )}
        </section>
      ))}
    </main>
  );
}
