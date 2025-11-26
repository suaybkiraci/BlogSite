'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <h2 className="text-4xl font-bold text-destructive">Something went wrong!</h2>
      <p className="mt-4 text-muted-foreground max-w-[500px]">
        An error occurred while processing your request. Please try again later.
      </p>
      <div className="mt-8 flex gap-4">
        <button
          onClick={reset}
          className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-input bg-background px-6 py-3 text-sm font-medium transition hover:bg-accent hover:text-accent-foreground"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

