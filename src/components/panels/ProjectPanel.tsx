import { useConfigStore } from '../../store/useConfigStore';

export function ProjectPanel() {
  const config = useConfigStore((s) => s.projectConfig);
  const setField = useConfigStore((s) => s.setProjectField);

  return (
    <div>
      <div className="control">
        <label>Ordernamn</label>
        <input
          type="text"
          value={config.ordernamn}
          onChange={(e) => setField('ordernamn', e.target.value)}
          placeholder="T.ex. ORD-2025-001"
        />
      </div>

      <div className="control">
        <label>BRF-namn</label>
        <input
          type="text"
          value={config.brfNamn}
          onChange={(e) => setField('brfNamn', e.target.value)}
          placeholder="T.ex. Brf Sjöutsikten"
        />
      </div>

      <div className="control">
        <label>Balkongtyp</label>
        <input
          type="text"
          value={config.balkongtyp}
          onChange={(e) => setField('balkongtyp', e.target.value)}
        />
      </div>

      <div className="control">
        <label>Glastyp</label>
        <select
          value={config.glastyp}
          onChange={(e) => setField('glastyp', e.target.value as 'Kristall' | 'Lag-E')}
        >
          <option value="Kristall">Kristall</option>
          <option value="Lag-E">Lag-E</option>
        </select>
      </div>

      <div className="control">
        <label>Glasuppdelning</label>
        <input
          type="text"
          value={config.glasuppdelning}
          onChange={(e) => setField('glasuppdelning', e.target.value)}
        />
      </div>

      <div className="control">
        <label>Instruktion till produktion</label>
        <textarea
          value={config.instruktionTillProduktion}
          onChange={(e) => setField('instruktionTillProduktion', e.target.value)}
          rows={3}
          style={{ resize: 'vertical', minHeight: 60 }}
        />
      </div>
    </div>
  );
}
