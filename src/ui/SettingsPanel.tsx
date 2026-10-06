import { SETTING_LIMITS, type Settings } from '../core/adjust';
import { MAX_COLORS, MIN_COLORS } from '../core/quantize';
import { Icon } from './Icon';

interface Props {
  n: number;
  onN: (n: number) => void;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onReset: () => void;
}

interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}

function Slider({ id, label, value, min, max, step = 1, suffix = '', onChange }: SliderProps) {
  return (
    <div className="field">
      <div className="field-head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>
          {value}
          {suffix}
        </output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function SettingsPanel({ n, onN, settings, onChange, onReset }: Props) {
  const L = SETTING_LIMITS;
  return (
    <aside className="settings" aria-label="Réglages">
      <div className="settings-head">
        <h2>Réglages</h2>
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          <Icon name="reset" size={16} />
          Réinitialiser les réglages
        </button>
      </div>

      <section>
        <h3>Couleurs</h3>
        <Slider id="n" label="Nombre de couleurs" value={n} min={MIN_COLORS} max={MAX_COLORS} onChange={onN} />
      </section>

      <section>
        <h3>Image de base</h3>
        <Slider id="brightness" label="Luminosité" value={settings.brightness} {...L.brightness} onChange={(v) => onChange({ brightness: v })} />
        <Slider id="contrast" label="Contraste" value={settings.contrast} {...L.contrast} onChange={(v) => onChange({ contrast: v })} />
        <Slider id="saturation" label="Saturation" value={settings.saturation} {...L.saturation} onChange={(v) => onChange({ saturation: v })} />
        <Slider id="blur" label="Lissage du grain" value={settings.blur} {...L.blur} suffix=" px" onChange={(v) => onChange({ blur: v })} />
        <Slider id="cleanup" label="Nettoyage des points isolés" value={settings.cleanup} {...L.cleanup} onChange={(v) => onChange({ cleanup: v })} />
        <Slider id="definition" label="Définition maximale" value={settings.definition} {...L.definition} suffix=" px" onChange={(v) => onChange({ definition: v })} />
      </section>

      <section>
        <h3>Impression</h3>
        <label className="check">
          <input type="checkbox" checked={settings.invert} onChange={(e) => onChange({ invert: e.target.checked })} />
          Inverser les valeurs
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.mirror} onChange={(e) => onChange({ mirror: e.target.checked })} />
          Miroir horizontal
        </label>
        <p className="hint">Le miroir est utile pour graver : l'impression inverse l'image.</p>
      </section>
    </aside>
  );
}
