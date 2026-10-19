import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LAYER_KEYS, useStore } from '../state/store';
import type { ModernLayer } from '../data/model';
import { loc } from '../i18n/localize';

/** Switches map layers on and off. */
export function LayerControl({ modern = [] }: { modern?: ModernLayer[] }) {
  const { t } = useTranslation();
  const { layers, toggleLayer, modernOff, toggleModern, lang } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <div className="layer-control">
      <button type="button" aria-expanded={open} aria-controls="layer-list" onClick={() => setOpen(!open)} data-testid="layers-button">
        {t('layers.title')}
      </button>
      {open && (
        <ul id="layer-list">
          {LAYER_KEYS.map((k) => (
            <li key={k}>
              <label>
                <input type="checkbox" checked={layers.includes(k)} onChange={() => toggleLayer(k)} data-testid={`layer-${k}`} /> {t(`layers.${k}`)}
              </label>
              {k === 'modern' && layers.includes('modern') && modern.length > 0 && (
                <ul className="sub-layers">
                  {modern.map((m) => (
                    <li key={m.id}>
                      <label>
                        <input type="checkbox" checked={!modernOff.includes(m.id)} onChange={() => toggleModern(m.id)} data-testid={`modern-${m.id}`} />{' '}
                        <span className="swatch" style={{ background: m.color }} aria-hidden /> {loc(m.name, lang)}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
