import { useCallback, useEffect, useState } from 'react';
import { api } from '../data/api';
import { DAY } from '../engine/mastery';
import { t } from '../i18n';
import { goBack, navigate } from '../router';
import type { AdminChildDTO, AdminOverviewDTO } from '../shared/api';
import { BarChart } from './Charts';
import { relativeDay, shortDate } from './format';

const CHART_DAYS = 30;

/** Most recent practice first; children who never practised last, newest first. */
const byActivity = (x: AdminChildDTO, y: AdminChildDTO) =>
  (y.lastActivityAt ?? 0) - (x.lastActivityAt ?? 0) || y.createdAt - x.createdAt;

const lastActive = (children: AdminChildDTO[]) => Math.max(0, ...children.map((c) => c.lastActivityAt ?? 0));

/** For the people who run Ashra: how many families and children use it, and each child's page. */
export function AdminDashboard() {
  const [data, setData] = useState<AdminOverviewDTO | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    api<AdminOverviewDTO>('GET', `/admin/overview?tz=${new Date().getTimezoneOffset()}`)
      .then(setData)
      .catch(() => setError(true));
  }, []);

  useEffect(load, [load]);

  const header = (
    <header className="parent-header">
      <div className="row">
        <button className="icon-btn" aria-label={t('common.back')} onClick={() => goBack('/parent')}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t('admin.title')}</h1>
      </div>
      <button className="btn btn-ghost" onClick={load} aria-label={t('common.refresh')}>
        ↻
      </button>
    </header>
  );

  if (error)
    return (
      <>
        {header}
        <p className="error-text">{t('common.error')}</p>
      </>
    );
  if (!data)
    return (
      <>
        {header}
        <p className="muted">{t('common.loading')}</p>
      </>
    );

  const now = Date.now();
  const weekAgo = now - 7 * DAY;
  const children = [...data.families.flatMap((f) => f.children), ...data.solo];
  const practised = children.filter((c) => c.answers > 0);
  const familiesPractised = data.families.filter((f) => f.children.some((c) => c.answers > 0));
  const practisedSince = (c: AdminChildDTO, ts: number) => c.answers > 0 && (c.lastActivityAt ?? 0) > ts;
  const activeWeek = children.filter((c) => practisedSince(c, weekAgo));
  const familiesWeek = data.families.filter((f) => f.children.some((c) => practisedSince(c, weekAgo)));
  const answers = children.reduce((sum, c) => sum + c.answers, 0);

  // Same day numbering as the server: days since 1970 in this browser's time zone.
  const tzMs = new Date().getTimezoneOffset() * 60_000;
  const today = Math.floor((now - tzMs) / DAY);
  const byDay = new Map(data.daily.map((d) => [d.day, d]));
  const days = Array.from({ length: CHART_DAYS }, (_, i) => {
    const day = today - CHART_DAYS + 1 + i;
    const noon = day * DAY + tzMs + DAY / 2;
    return { noon, children: byDay.get(day)?.children ?? 0, answers: byDay.get(day)?.answers ?? 0 };
  });
  const answersWeek = days.slice(-7).reduce((sum, d) => sum + d.answers, 0);

  const families = [...data.families].sort(
    (x, y) => lastActive(y.children) - lastActive(x.children) || y.createdAt - x.createdAt,
  );
  const solo = [...data.solo].sort(byActivity);
  const soloPractised = solo.filter((c) => c.answers > 0);
  const soloNotYet = solo.filter((c) => c.answers === 0);

  return (
    <>
      {header}

      <section className="tiles" aria-label={t('parent.overview')}>
        <div className="stat">
          <div className="value">{data.families.length}</div>
          <div className="label">{t('admin.families')}</div>
          <div className="label">{t('admin.familiesPractised', { n: familiesPractised.length })}</div>
        </div>
        <div className="stat">
          <div className="value">{children.length}</div>
          <div className="label">{t('admin.children')}</div>
          <div className="label">{t('admin.childrenPractised', { n: practised.length, m: data.solo.length })}</div>
        </div>
        <div className="stat">
          <div className="value">{activeWeek.length}</div>
          <div className="label">{t('admin.activeWeek')}</div>
          <div className="label">{t('admin.activeWeekFamilies', { n: familiesWeek.length })}</div>
        </div>
        <div className="stat">
          <div className="value">{answers.toLocaleString('en')}</div>
          <div className="label">{t('admin.answers')}</div>
          <div className="label">{t('admin.answersWeek', { n: answersWeek.toLocaleString('en') })}</div>
        </div>
      </section>

      <section className="card stack">
        <h2>{t('admin.dailyTitle')}</h2>
        <p className="muted small">{t('admin.dailyNote')}</p>
        <BarChart
          label={t('admin.dailyTitle')}
          data={days.map((d) => ({
            label: String(new Date(d.noon).getDate()),
            value: d.children,
            detail: t('admin.dailyDetail', { date: shortDate(d.noon), n: d.children, a: d.answers }),
          }))}
        />
      </section>

      <section className="stack">
        <h2 style={{ fontSize: '1.1rem' }}>{t('admin.familiesTitle')}</h2>
        {families.length ? (
          <div className="grid-2">
            {families.map((f) => (
              <section key={f.id} className="card stack" style={{ gap: 4 }}>
                <h3 style={{ fontSize: '1rem', overflowWrap: 'anywhere' }}>{f.email}</h3>
                <p className="muted small">{t('admin.joined', { date: shortDate(f.createdAt) })}</p>
                {f.children.length ? (
                  <ChildList items={[...f.children].sort(byActivity)} />
                ) : (
                  <p className="muted small">{t('admin.noChildren')}</p>
                )}
              </section>
            ))}
          </div>
        ) : (
          <p className="muted">{t('admin.familiesNone')}</p>
        )}
      </section>

      <section className="card stack" style={{ gap: 4 }}>
        <h2>{t('admin.soloTitle')}</h2>
        <p className="muted small">{t('admin.soloNote')}</p>
        {soloPractised.length > 0 && <ChildList items={soloPractised} />}
        {soloNotYet.length > 0 && (
          <details>
            <summary className="muted small" style={{ cursor: 'pointer', padding: '10px 0' }}>
              {t('admin.notYet', { n: soloNotYet.length })}
            </summary>
            <ChildList items={soloNotYet} />
          </details>
        )}
        {!solo.length && <p className="muted small">{t('admin.soloNone')}</p>}
      </section>
    </>
  );
}

function ChildList({ items }: { items: AdminChildDTO[] }) {
  return (
    <div className="list">
      {items.map((c) => (
        <button
          key={c.id}
          className="child-card"
          style={{ background: 'none', border: 'none', borderBottom: '1px solid var(--line)', color: 'inherit' }}
          onClick={() => navigate(`/parent/admin/child/${c.id}`)}
        >
          <span className="avatar" aria-hidden="true">
            {c.avatar}
          </span>
          <span className="stack grow" style={{ gap: 2 }}>
            <strong>{c.displayName || t('parent.noName')}</strong>
            <span className="muted small">
              {c.lastActivityAt
                ? t('parent.lastActive', { when: relativeDay(c.lastActivityAt) })
                : t('admin.started', { date: shortDate(c.createdAt) })}
            </span>
            <span className="muted small">
              {t('admin.childStats', { answers: c.answers.toLocaleString('en'), days: c.practiceDays })} ·{' '}
              {t('parent.phones', { n: c.deviceCount })}
            </span>
          </span>
          <span className="flip-rtl muted" aria-hidden="true">
            →
          </span>
        </button>
      ))}
    </div>
  );
}
