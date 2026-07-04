// Shown to signed-in admins on prediction surfaces when the feature is turned
// OFF for the public — a reminder that what they're seeing is a private preview.

export function FerryPredictionPreviewBanner({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-coral/40 bg-coral/10 px-4 py-2 text-sm font-medium text-coral-deep ${className}`}>
      Ferry busyness prediction is <strong>hidden from visitors</strong> — you&rsquo;re seeing an admin
      preview. Turn it on in Admin → Ferry settings.
    </div>
  );
}
