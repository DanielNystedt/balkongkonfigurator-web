import { useConfigStore } from '../../store/useConfigStore';
import type { BarlinaType, BottenprofilType, BrostningsramType } from '../../types/profile';

const BARLINA_OPTIONS: BarlinaType[] = ['100x100', '50x100x100', '100x50', 'L-Stal', 'Ingen'];
const BOTTENPROFIL_OPTIONS: BottenprofilType[] = ['50x30', '50x50', 'Ingen'];
const BROSTNINGSRAM_OPTIONS: BrostningsramType[] = [
  'Vit Panel',
  'Vit & Gra Panel',
  'Fast Glas',
  'Oppningsbart Glas',
  'Brand',
];

export function ProfilePanel() {
  const config = useConfigStore((s) => s.profileConfig);
  const setField = useConfigStore((s) => s.setProfileField);

  return (
    <div>
      <div className="checkbox-row">
        <input
          type="checkbox"
          checked={config.isHelinglasning}
          onChange={(e) => setField('isHelinglasning', e.target.checked)}
        />
        <label>Helinglasning</label>
      </div>

      <div className="control">
        <label>Barlina</label>
        <select
          value={config.barlinaType}
          onChange={(e) => setField('barlinaType', e.target.value as BarlinaType)}
        >
          {BARLINA_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="control">
        <label>Bottenprofil</label>
        <select
          value={config.bottenprofilType}
          onChange={(e) => setField('bottenprofilType', e.target.value as BottenprofilType)}
        >
          {BOTTENPROFIL_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="checkbox-row">
        <input
          type="checkbox"
          checked={config.vaggEnabled}
          onChange={(e) => setField('vaggEnabled', e.target.checked)}
        />
        <label>Visa vägg</label>
      </div>

      <div className="checkbox-row">
        <input
          type="checkbox"
          checked={config.brostningEnabled}
          onChange={(e) => setField('brostningEnabled', e.target.checked)}
        />
        <label>Visa bröstning</label>
      </div>

      {config.brostningEnabled && (
        <div className="control">
          <label>Bröstningsramtyp</label>
          <select
            value={config.brostningsramType}
            onChange={(e) => setField('brostningsramType', e.target.value as BrostningsramType)}
          >
            {BROSTNINGSRAM_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
