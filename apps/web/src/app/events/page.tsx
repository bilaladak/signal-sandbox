'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

interface Event {
  id: string;
  title: string;
  summary: string | null;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source_name: string | null;
  source_url: string | null;
  published_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface EventsResponse {
  data: Event[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
};

const CATEGORY_LABELS: Record<string, string> = {
  geopolitical: 'Geopolitical',
  macro: 'Macro',
  sector: 'Sector',
  company: 'Company',
  regulatory: 'Regulatory',
  earnings: 'Earnings',
  other: 'Other',
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const limit = 20;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (categoryFilter) params.set('category', categoryFilter);
    if (severityFilter) params.set('severity', severityFilter);

    const res = await apiFetch<EventsResponse>(`/events?${params.toString()}`);

    if (res.success && res.data) {
      setEvents(res.data.data);
      setTotal(res.data.meta.total);
    } else {
      setError(res.error?.message || 'Failed to load events');
    }
    setLoading(false);
  }, [page, categoryFilter, severityFilter]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }
    fetchEvents();
  }, [fetchEvents]);

  const totalPages = Math.ceil(total / limit);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <main className="min-h-screen p-8">
      <header className="flex items-center justify-between border-b pb-4 mb-8">
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Dashboard
          </a>
          <span className="text-gray-300">|</span>
          <h1 className="text-xl font-bold">
            Signal<span className="text-blue-600">Sandbox</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {total} event{total !== 1 ? 's' : ''}
        </div>
      </header>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Events</h2>
        </div>

        <div className="flex gap-3 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {(categoryFilter || severityFilter) && (
            <button
              onClick={() => { setCategoryFilter(''); setSeverityFilter(''); setPage(1); }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <p className="text-gray-400">Loading events...</p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-400 text-lg mb-2">No events found</p>
          <p className="text-gray-400 text-sm">
            {categoryFilter || severityFilter
              ? 'Try adjusting your filters'
              : 'Events will appear here once they are ingested'}
          </p>
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <>
          <div className="space-y-3">
            {events.map((event) => (
              <a
                key={event.id}
                href={`/events/${event.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.low}`}
                      >
                        {event.severity.toUpperCase()}
                      </span>
                      <span className="rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs text-blue-700">
                        {CATEGORY_LABELS[event.category] || event.category}
                      </span>
                      {event.source_name && (
                        <span className="text-xs text-gray-400">{event.source_name}</span>
                      )}
                    </div>

                    <h3 className="font-medium text-gray-900 leading-snug mb-1 truncate">
                      {event.title}
                    </h3>

                    {event.summary && (
                      <p className="text-sm text-gray-500 line-clamp-2">{event.summary}</p>
                    )}
                  </div>

                  <div className="text-xs text-gray-400 whitespace-nowrap shrink-0 pt-0.5">
                    {formatDate(event.published_at || event.created_at)}
                  </div>
                </div>
              </a>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
