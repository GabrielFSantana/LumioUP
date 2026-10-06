import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';

interface ConfirmButtonProps {
  label: string;
  /** Texto do segundo toque (ex.: "Toque de novo para remover"). */
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
}

const ARMED_MS = 4000;

/**
 * Ação destrutiva em dois toques: o primeiro "arma" o botão (por 4 segundos), o segundo executa.
 * Evita depender de diálogos nativos, que não existem na web.
 */
export function ConfirmButton({ label, confirmLabel, onConfirm, disabled }: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const press = () => {
    if (armed) {
      if (timer.current) clearTimeout(timer.current);
      setArmed(false);
      onConfirm();
      return;
    }
    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), ARMED_MS);
  };

  return (
    <Button
      label={armed ? confirmLabel : label}
      variant={armed ? 'primary' : 'secondary'}
      onPress={press}
      disabled={disabled}
    />
  );
}
