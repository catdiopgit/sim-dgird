import { DatePicker, Segmented } from 'antd';
import dayjs from 'dayjs';
import { periodeDepuisPreset, PRESETS_LABEL, type Periode, type PeriodePreset } from './periode';

const { RangePicker } = DatePicker;

interface Props {
  periode: Periode;
  onChange: (periode: Periode) => void;
}

const OPTIONS = [
  ...Object.entries(PRESETS_LABEL).map(([value, label]) => ({ value, label })),
  { value: 'personnalise', label: 'Période personnalisée' },
];

export function PeriodSelector({ periode, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <Segmented
        value={periode.preset}
        options={OPTIONS}
        onChange={(value) => onChange(periodeDepuisPreset(value as PeriodePreset, periode.debut, periode.fin))}
      />
      {periode.preset === 'personnalise' && (
        <RangePicker
          value={[periode.debut, periode.fin]}
          format="DD/MM/YYYY"
          allowClear={false}
          onChange={(v) => {
            if (v && v[0] && v[1]) {
              onChange({ preset: 'personnalise', debut: dayjs(v[0]).startOf('day'), fin: dayjs(v[1]).endOf('day') });
            }
          }}
        />
      )}
    </div>
  );
}
