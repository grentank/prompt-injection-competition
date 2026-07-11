type StarRatingProps = {
  value: number;
  showValue?: boolean;
};

export default function StarRating({ value, showValue = true }: StarRatingProps) {
  const rating = Math.max(0, Math.min(5, value || 0));

  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Рейтинг ${rating.toFixed(1)} из 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = rating >= i + 1;
        const partial = !filled && rating > i;
        return (
          <span
            key={i}
            className={`text-sm leading-none ${
              filled ? 'text-amber-400' : partial ? 'text-amber-400/40' : 'text-zinc-700'
            }`}
          >
            ★
          </span>
        );
      })}
      {showValue && <span className="text-xs text-zinc-500 ml-1">{rating.toFixed(1)}</span>}
    </span>
  );
}
