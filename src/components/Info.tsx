import { openHelp } from '../Help';
import { t } from '../i18n';
import { Sheet } from './FactSheet';

/** A small ⓘ button, drawn so it looks the same on every phone. */
export function InfoButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="icon-btn icon-btn-sm info-btn" aria-label={label} title={label} onClick={onClick}>
      <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
        <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="10" cy="6.2" r="1.15" fill="currentColor" />
        <path d="M10 9v5.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </button>
  );
}

const MAP_KEYS = [
  { level: 0, name: 'map.legendNew', text: 'help.mapNew' },
  { level: 1, name: 'map.legendLearning', text: 'help.mapLearning' },
  { level: 3, name: 'map.legendFluent', text: 'help.mapFluent' },
  { level: 5, name: 'map.legendMastered', text: 'help.mapMastered' },
];

/** What the fact map's colours mean, with a way into the full explanation. */
export function MapHelpSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <h2 style={{ fontSize: '1.15rem' }}>{t('help.mapTitle')}</h2>
      <ul className="help-keys">
        {MAP_KEYS.map((k) => (
          <li key={k.level}>
            <span className="swatch" style={{ background: `var(--lv${k.level})` }} aria-hidden="true" />
            <span>
              <strong className="block">{t(k.name)}</strong>
              {t(k.text)}
            </span>
          </li>
        ))}
      </ul>
      <p className="muted small">{t('help.mapNote')}</p>
      <button className="link" style={{ alignSelf: 'flex-start' }} onClick={() => openHelp('levels')}>
        {t('help.readMore')} <span className="flip-rtl">→</span>
      </button>
    </Sheet>
  );
}
