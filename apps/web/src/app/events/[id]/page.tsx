'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface Event {
  id: string;
  title: string;
  summary: string | null;
  raw_content: string | null;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source_name: string | null;
  source_url: string | null;
  published_at: string | null;
  created_at: string;
  metadata: {
    classification?: {
      category: string;
      severity: string;
      significance_score: number;
      is_duplicate: boolean;
      reasoning: string;
    };
    extraction?: {
      headline: string;
      summary: string;
      affected_assets: Array<{
        ticker: string;
        name?: string;
        impact_type: string;
        impact_direction: string;
        confidence: number;
      }>;
      affected_sectors: string[];
      affected_regions: string[];
      key_risks: string[];
      reasoning: string;
      confidence: number;
    };
  } | null;
}

interface LinkedAsset {
  id: string;
  symbol: string;
  name: string;
  type: string;
  relevance_score: number;
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
};

const IMPACT_DIRECTION_STYLES: Record<string, string> = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  neutral: 'text-gray-500',
  unknown: 'text-gray-400',
};

export default function EventDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [linkedAssets, setLinkedAssets] = useState<LinkedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);

      const [eventRes, assetsRes] = await Promise.all([
        apiFetch<Event>(`/events/${id}`),
        apiFetch<LinkedAsset[]>(`/events/${id}/assets`),
      ]);

      if (eventRes.success && eventRes.data) {
        setEvent(eventRes.data);
      } else {
        setError(eventRes.error?.message || 'Event not found');
        setLoading(false);
        return;
      }

      if (assetsRes.success && assetsRes.data) {
        setLinkedAssets(assetsRes.data);
      }

      setLoading(false);
    }

    load();
  }, [id]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="flex items-center justify-center py-16">
          <p className="text-gray-400">Loading event...</p>
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="min-h-screen p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || 'Event not found'}
        </div>
        <a href="/events" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to Events
        </a>
      </main>
    );
  }

  const classification = event.metadata?.classification;
  const extraction = event.metadata?.extraction;

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <header className="flex items-center gap-3 border-b pb-4 mb-8">
        <a href="/events" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Events
        </a>
        <span className="text-gray-300">|</span>
        <a href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
          Dashboard
        </a>
      </header>

      {/* Event header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.low}`}
          >
            {event.severity.toUpperCase()}
          </span>
          <span className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs text-blue-700 capitalize">
            {event.category}
          </span>
          {event.source_name && (
            <span className="text-xs text-gray-400">{event.source_name}</span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 leading-snug mb-2">
          {event.title}
        </h1>

        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>Published: {formatDate(event.published_at)}</span>
          <span>Ingested: {formatDate(event.created_at)}</span>
        </div>

        {event.source_url && (
          <a
            href={event.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-blue-600 hover:underline"
          >
            View source →
          </a>
        )}
      </div>

      {/* Summary */}
      {event.summary && (
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Summary
          </h2>
          <p className="text-gray-800 leading-relaxed">{event.summary}</p>
        </section>
      )}

      {/* AI Classification */}
      {classification && (
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            AI Classification
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Category</p>
              <p className="text-sm font-medium capitalize">{classification.category}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Severity</p>
              <p className="text-sm font-medium capitalize">{classification.severity}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Significance</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${(classification.significance_score / 10) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{classification.significance_score}/10</span>
              </div>
            </div>
          </div>
          {classification.reasoning && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Reasoning</p>
              <p className="text-sm text-gray-600 italic">{classification.reasoning}</p>
            </div>
          )}
        </section>
      )}

      {/* AI Extraction */}
      {extraction && (
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            AI Extraction
          </h2>

          {extraction.affected_sectors && extraction.affected_sectors.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">Affected Sectors</p>
              <div className="flex flex-wrap gap-1.5">
                {extraction.affected_sectors.map((sector) => (
                  <span
                    key={sector}
                    className="rounded-full bg-purple-50 border border-purple-100 px-2.5 py-0.5 text-xs text-purple-700"
                  >
                    {sector}
                  </span>
                ))}
              </div>
            </div>
          )}

          {extraction.affected_regions && extraction.affected_regions.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">Affected Regions</p>
              <div className="flex flex-wrap gap-1.5">
                {extraction.affected_regions.map((region) => (
                  <span
                    key={region}
                    className="rounded-full bg-gray-50 border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600"
                  >
                    {region}
                  </span>
                ))}
              </div>
            </div>
          )}

          {extraction.key_risks && extraction.key_risks.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">Key Risks</p>
              <ul className="space-y-1">
                {extraction.key_risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-red-400 mt-0.5 shrink-0">•</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {extraction.affected_assets && extraction.affected_assets.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Extracted Assets</p>
              <div className="space-y-2">
                {extraction.affected_assets.map((asset, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{asset.ticker}</span>
                      {asset.name && (
                        <span className="text-xs text-gray-400">{asset.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 capitalize">{asset.impact_type}</span>
                      <span
                        className={`text-xs font-medium capitalize ${IMPACT_DIRECTION_STYLES[asset.impact_direction] || IMPACT_DIRECTION_STYLES.unknown}`}
                      >
                        {asset.impact_direction}
                      </span>
                      <span className="text-xs text-gray-400">
                        {Math.round(asset.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Linked Assets */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Linked Assets
          {linkedAssets.length > 0 && (
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500 normal-case">
              {linkedAssets.length}
            </span>
          )}
        </h2>

        {linkedAssets.length === 0 ? (
          <p className="text-sm text-gray-400">No assets linked to this event yet.</p>
        ) : (
          <div className="space-y-2">
            {linkedAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 hover:border-blue-200 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{asset.symbol}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 capitalize">
                      {asset.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{asset.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Relevance</p>
                  <p className="text-sm font-medium">
                    {Math.round(asset.relevance_score * 100)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Raw Content */}
      {event.raw_content && (
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Raw Content
          </h2>
          <div className="max-h-48 overflow-y-auto">
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {event.raw_content}
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
