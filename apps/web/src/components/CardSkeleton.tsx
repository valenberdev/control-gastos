interface CardSkeletonProps {
  height: number;
  label?: string;
}

// Placeholder con la forma de una tarjeta mientras llegan los datos o el código del gráfico.
export default function CardSkeleton({ height, label }: CardSkeletonProps) {
  return (
    <div
      className="card card-skeleton"
      style={{ minHeight: height }}
      role="status"
      aria-label={label ?? "Cargando"}
    >
      <span className="skeleton-line skeleton-line-short" />
      <span className="skeleton-line" />
      <span className="skeleton-line skeleton-line-mid" />
    </div>
  );
}
