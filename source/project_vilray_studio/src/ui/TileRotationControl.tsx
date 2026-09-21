import { useEffect, useState } from 'react';

export function TileRotationControl({ disabled, degrees, onApply }: {
  disabled: boolean;
  degrees: number;
  onApply: (degrees: number) => void;
}) {
  const [value, setValue] = useState(String(degrees));
  useEffect(() => setValue(String(degrees)), [degrees]);
  const parsed = Number(value.trim().replace(',', '.'));
  const valid = value.trim() !== '' && Number.isFinite(parsed);
  return (
    <form className="tile-rotation-control" onSubmit={(event) => {
      event.preventDefault();
      if (disabled || !valid) return;
      const normalized = Math.round((((parsed % 360) + 360) % 360) * 10) / 10 % 360;
      onApply(normalized);
      setValue(String(normalized));
    }}>
      <h2 className="tile-rotation-title">Вращение</h2>
      <input aria-label="Введите градус" placeholder="Введите градус" inputMode="decimal" disabled={disabled} value={value} onChange={(event) => setValue(event.currentTarget.value)} />
      <button className="tile-rotation-apply" type="submit" disabled={disabled || !valid}>Применить</button>
    </form>
  );
}
