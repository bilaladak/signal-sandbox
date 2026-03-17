'use client';

import { useEffect, useState } from 'react';
import type { UserProfile } from '@signal-sandbox/shared-types';

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUser(data.data);
        } else {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/auth/login';
        }
      })
      .catch(() => {
        window.location.href = '/auth/login';
      });
  }, []);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <header className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold">
          Signal<span className="text-blue-600">Sandbox</span>
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.email}</span>
          <button
            onClick={() => {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              window.location.href = '/auth/login';
            }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Scenarios"
          description="Create and simulate investment scenarios with multi-agent analysis"
          count={0}
          href="/scenarios"
        />
        <DashboardCard
          title="Events"
          description="Track market events, news, and signals across your watchlist"
          count={0}
          href="/events"
        />
        <DashboardCard
          title="Portfolio"
          description="Analyze your portfolio exposure and vulnerability to events"
          count={0}
          href="/portfolio"
        />
        <DashboardCard
          title="Reports"
          description="View generated analysis reports with citations"
          count={0}
          href="/reports"
        />
        <DashboardCard
          title="Watchlist"
          description="Manage your asset watchlist and track relevant signals"
          count={0}
          href="/watchlist"
        />
        <DashboardCard
          title="Knowledge Graph"
          description="Explore relationships between assets, events, and themes"
          count={0}
          href="/graph"
        />
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  description,
  count,
  href,
}: {
  title: string;
  description: string;
  count: number;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm text-gray-600">
          {count}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </a>
  );
}
