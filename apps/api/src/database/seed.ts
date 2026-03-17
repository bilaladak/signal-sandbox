import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';

async function seed() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'signal_sandbox',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Seed organisation
    const orgId = uuidv4();
    await client.query(
      `INSERT INTO organisations (id, name, plan) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [orgId, 'Demo Workspace', 'pro'],
    );

    // Seed admin user
    const passwordHash = await bcrypt.hash('password123', 12);
    await client.query(
      `INSERT INTO users (id, email, name, password_hash, org_id, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [uuidv4(), 'admin@signalsandbox.dev', 'Demo Admin', passwordHash, orgId, 'owner'],
    );

    // Seed agent profiles (10 archetypes)
    const agents = [
      { archetype: 'retail_investor', name: 'Retail Investor', persona: 'Individual investor with moderate risk tolerance, influenced by social media and news headlines. Tends to follow trends and may panic sell during downturns.', time_horizon: '1-6 months', risk_appetite: 'moderate', reaction_latency: '1-3 days' },
      { archetype: 'momentum_trader', name: 'Momentum Trader', persona: 'Quantitative trader focused on price momentum and technical signals. Uses moving averages and RSI for entry/exit decisions. Fast reaction to breakouts.', time_horizon: '1-4 weeks', risk_appetite: 'high', reaction_latency: 'hours' },
      { archetype: 'value_investor', name: 'Value Investor', persona: 'Fundamental analyst seeking undervalued assets with margin of safety. Patient, contrarian, focused on intrinsic value and earnings quality.', time_horizon: '1-5 years', risk_appetite: 'low-moderate', reaction_latency: '1-2 weeks' },
      { archetype: 'macro_fund', name: 'Macro Fund Manager', persona: 'Global macro strategist analyzing central bank policy, GDP trends, and geopolitical risk. Positions across asset classes based on regime shifts.', time_horizon: '3-12 months', risk_appetite: 'moderate-high', reaction_latency: '1-3 days' },
      { archetype: 'long_only_fund', name: 'Long-Only Fund', persona: 'Institutional fund manager with benchmark-relative mandates. Focused on sector allocation and quality growth names. Constrained by investment policy.', time_horizon: '6-18 months', risk_appetite: 'moderate', reaction_latency: '1 week' },
      { archetype: 'short_seller', name: 'Short Seller', persona: 'Forensic analyst looking for overvalued companies, accounting red flags, and governance issues. Profits from price declines and public skepticism.', time_horizon: '1-6 months', risk_appetite: 'high', reaction_latency: '1-2 days' },
      { archetype: 'regulator', name: 'Market Regulator', persona: 'Regulatory body monitoring market stability, systemic risk, and investor protection. Reacts to unusual trading patterns and compliance breaches.', time_horizon: '1-3 years', risk_appetite: 'risk-averse', reaction_latency: '1-4 weeks' },
      { archetype: 'media_narrative', name: 'Media Narrative Agent', persona: 'Financial media analyst shaping public perception through coverage bias, headline selection, and narrative framing. Amplifies fear and greed cycles.', time_horizon: '1-7 days', risk_appetite: 'n/a', reaction_latency: 'hours' },
      { archetype: 'market_maker', name: 'Market Maker', persona: 'Liquidity provider managing bid-ask spreads and inventory risk. Reacts to order flow imbalances and volatility spikes with automated hedging.', time_horizon: 'intraday-1 week', risk_appetite: 'neutral', reaction_latency: 'minutes' },
      { archetype: 'risk_off_allocator', name: 'Risk-Off Allocator', persona: 'Conservative wealth manager prioritizing capital preservation. Shifts to bonds, gold, and cash during uncertainty. Focused on tail risk.', time_horizon: '6-24 months', risk_appetite: 'low', reaction_latency: '1-2 weeks' },
    ];

    for (const agent of agents) {
      await client.query(
        `INSERT INTO agent_profiles (id, archetype, name, persona, time_horizon, risk_appetite, reaction_latency, confidence_threshold)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [uuidv4(), agent.archetype, agent.name, agent.persona, agent.time_horizon, agent.risk_appetite, agent.reaction_latency, 0.6],
      );
    }

    // Seed some common assets
    const assets = [
      { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', sector: 'Technology', country: 'US' },
      { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock', sector: 'Technology', country: 'US' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', sector: 'Technology', country: 'US' },
      { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', sector: 'Consumer Discretionary', country: 'US' },
      { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', sector: 'Cryptocurrency', country: 'Global' },
      { symbol: 'ETH', name: 'Ethereum', type: 'crypto', sector: 'Cryptocurrency', country: 'Global' },
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'etf', sector: 'Broad Market', country: 'US' },
      { symbol: 'GLD', name: 'SPDR Gold Shares', type: 'etf', sector: 'Commodities', country: 'Global' },
      { symbol: 'DXY', name: 'US Dollar Index', type: 'index', sector: 'Currency', country: 'US' },
      { symbol: 'USO', name: 'United States Oil Fund', type: 'commodity', sector: 'Energy', country: 'US' },
    ];

    for (const asset of assets) {
      await client.query(
        `INSERT INTO assets (id, symbol, name, type, sector, country)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [uuidv4(), asset.symbol, asset.name, asset.type, asset.sector, asset.country],
      );
    }

    await client.query('COMMIT');
    console.log('✓ Seed data inserted successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed runner failed:', err);
  process.exit(1);
});
