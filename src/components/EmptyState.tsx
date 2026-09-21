"use client"
import type { ReactNode } from 'react';

/**
 * Estado vacío para listas y tablas.
 *
 * Una tabla en blanco hace que el producto parezca roto, sobre todo el
 * primer día, que es cuando el cliente decide si esto sirve o no. Acá
 * siempre hay una sola cosa para hacer y está a un click.
 *
 * `hint` es para lo que conviene saber antes de empezar —por qué carga el
 * costo, para qué sirve el IMEI—. Es la diferencia entre una pantalla que
 * avisa que está vacía y una que enseña a usar el sistema.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondary,
  hint,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: ReactNode };
  /** Salida alternativa, para el que no quiere hacer lo principal todavía. */
  secondary?: { label: string; onClick: () => void };
  hint?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-text">{description}</div>}

      {(action || secondary) && (
        <div className="empty-state-actions">
          {action && (
            <button className="btn btn-dark" onClick={action.onClick}>
              {action.icon}
              {action.label}
            </button>
          )}
          {secondary && (
            <button className="btn btn-ghost" onClick={secondary.onClick}>
              {secondary.label}
            </button>
          )}
        </div>
      )}

      {hint && <div className="empty-state-hint">{hint}</div>}
    </div>
  );
}
