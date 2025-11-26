import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <h2 className="text-6xl font-bold text-primary">404</h2>
      <h3 className="mt-4 text-2xl font-semibold tracking-tight">Page not found</h3>
      <p className="mt-4 text-muted-foreground max-w-[500px]">
        Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or deleted.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
      >
        Back to Home
      </Link>
    </div>
  );
}

