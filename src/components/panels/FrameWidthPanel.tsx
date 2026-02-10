import { useConfigStore } from '../../store/useConfigStore';

export function FrameWidthPanel() {
  const settings = useConfigStore((s) => s.frameWidthSettings);
  const setField = useConfigStore((s) => s.setFrameWidthField);

  return (
    <div>
      <SliderField
        label="Max bredd glas"
        value={settings.maxWidthGlass}
        unit="mm"
        min={200}
        max={1200}
        step={50}
        onChange={(v) => setField('maxWidthGlass', v)}
      />
      <SliderField
        label="Max bredd täckt"
        value={settings.maxWidthCovered}
        unit="mm"
        min={200}
        max={1200}
        step={50}
        onChange={(v) => setField('maxWidthCovered', v)}
      />
      <SliderField
        label="Max bredd vägg"
        value={settings.maxWidthWall}
        unit="mm"
        min={200}
        max={2000}
        step={50}
        onChange={(v) => setField('maxWidthWall', v)}
      />
    </div>
  );
}

function SliderField({ label, value, unit, min, max, step, onChange }: {
  label: string; value: number; unit: string;
  min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="control">
      <label>{label} <span className="value">{value} {unit}</span></label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
