"use client"
import type { ReactNode } from 'react';

/**
 * Estado vacío reutilizable para listas y tablas. En vez de una tabla en
 * blanco, muestra un ícono, un mensaje claro y —cuando corresponde— un botón
 * para crear el primer registro. Distingue "todavía no hay datos" de "el
 * filtro/búsqueda no encontró nada", que se resuelven distinto.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: ReactNode };
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-text">{description}</div>}
      {action && (
        <button className="btn btn-dark" style={{ marginTop: 18 }} onClick={action.onClick}>
          {action.icon}
          {action.label}
        </button>
      )}
    </div>
  );
}
