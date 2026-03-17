import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Signal<span className="text-blue-600">Sandbox</span>
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Investment decision support platform. Simulate scenarios, interpret signals,
          and analyze how different market participants would react to events.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg border border-gray-300 px-6 py-3 font-medium hover:bg-gray-100 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </main>
  );
}
