/**
 * Gateway-routing tests.
 *
 * The backend is four separate API Gateways. A request sent to the wrong one
 * gets API Gateway's `403 Missing Authentication Token` for an unknown route,
 * which reads like an auth failure and is not. These tests assert each service
 * module reaches the gateway that actually owns its routes.
 *
 * The real services/api is used here (the global mock in src/test/setup.ts is
 * unmocked) and global.fetch is stubbed, so what is asserted is the URL the
 * client genuinely builds.
 */

import {
  extendedFeaturesApi,
  featuresApi,
  budgetsApi,
  api,
  apiCall,
  API_CONFIG,
} from '../api';
import {
  apiBaseUrl,
  featuresApiUrl,
  extendedFeaturesApiUrl,
  budgetsApiUrl,
} from '../../config/api';
import { ID_TOKEN_KEY } from '../storage-keys';
import * as SecureStore from 'expo-secure-store';
// jest.unmock above is hoisted, so these resolve against the real ../api.
import { insightsService } from '../insights';
import { netWorthService } from '../netWorth';
import { receiptService } from '../receipt';
import { creditScoreService } from '../creditScore';
import { investmentsService } from '../investments';
import { getUpcomingOccurrences } from '../budget';

jest.unmock('../api');

const MAIN_HOST = 'q0zoob6728.execute-api.us-east-1.amazonaws.com';
const FEATURES_HOST = '0poeu07vth.execute-api.us-east-1.amazonaws.com';
const EXTENDED_HOST = 'hkjzroedjf.execute-api.us-east-1.amazonaws.com';
const BUDGETS_HOST = 'jcl39tq8x0.execute-api.us-east-1.amazonaws.com';

const fetchMock = jest.fn();

/** The URL the last fetch call was made with. */
function lastUrl(): string {
  return String(fetchMock.mock.calls.at(-1)?.[0]);
}

/** The headers the last fetch call was made with. */
function lastHeaders(): Record<string, string> {
  return (fetchMock.mock.calls.at(-1)?.[1] as RequestInit)?.headers as Record<string, string>;
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ data: [] }),
  });
  (global as unknown as { fetch: unknown }).fetch = fetchMock;

  // A token must be present or apiRequest short-circuits with 401 before
  // reaching fetch.
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-id-token');
});

describe('gateway configuration', () => {
  it('resolves four distinct gateway URLs', () => {
    const urls = [apiBaseUrl, featuresApiUrl, extendedFeaturesApiUrl, budgetsApiUrl];
    expect(new Set(urls).size).toBe(4);
  });

  it('points each URL at the gateway that owns its routes', () => {
    expect(apiBaseUrl).toContain(MAIN_HOST);
    expect(featuresApiUrl).toContain(FEATURES_HOST);
    expect(extendedFeaturesApiUrl).toContain(EXTENDED_HOST);
    expect(budgetsApiUrl).toContain(BUDGETS_HOST);
  });

  it('keeps the /v1 stage prefix on every gateway URL', () => {
    for (const url of [apiBaseUrl, featuresApiUrl, extendedFeaturesApiUrl, budgetsApiUrl]) {
      expect(url.endsWith('/v1')).toBe(true);
    }
  });
});

describe('per-service gateway routing', () => {
  it('routes insights at the extended features gateway', async () => { await insightsService.getWeeklyInsights();
    expect(lastUrl()).toContain(EXTENDED_HOST);
    expect(lastUrl()).toContain('/insights/weekly');
  });

  it('routes net worth at the extended features gateway', async () => { await netWorthService.getSummary();
    expect(lastUrl()).toContain(EXTENDED_HOST);
    expect(lastUrl()).toContain('/net-worth/summary');
  });

  it('routes receipt at the extended features gateway', async () => { await receiptService.getUsage();
    expect(lastUrl()).toContain(EXTENDED_HOST);
    expect(lastUrl()).toContain('/receipt/usage');
  });

  it('routes credit score at the features gateway', async () => { await creditScoreService.getCreditScore();
    expect(lastUrl()).toContain(FEATURES_HOST);
    expect(lastUrl()).toContain('/credit-score');
  });

  it('routes investments at the features gateway', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ holdings: [] }),
    }); await investmentsService.getPortfolio();
    expect(lastUrl()).toContain(FEATURES_HOST);
    expect(lastUrl()).toContain('/investments');
  });

  it('routes budgets at the budgets gateway', async () => {
    // /budgets/* lives on the dedicated budgets gateway, not the main one.
    // budget.ts reaches fetch through its own `budgetsApi` client, so this
    // asserts the service module's routing rather than the client factory's.
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => [],
    });

    await getUpcomingOccurrences();

    expect(lastUrl()).toContain(BUDGETS_HOST);
    expect(lastUrl()).toContain('/budgets');
    expect(lastUrl()).not.toContain(MAIN_HOST);
  });

  it('routes plaid at the features gateway', () => {
    // services/plaid.ts builds its own URLs from featuresApiUrl rather
    // than going through a client, so assert the URL it reads.
    expect(featuresApiUrl).toContain(FEATURES_HOST);
  });
});

describe('client factory', () => {
  it('sends each client to its own gateway for the same endpoint', async () => {
    await api.get('/ping');
    expect(lastUrl()).toContain(MAIN_HOST);

    await featuresApi.get('/ping');
    expect(lastUrl()).toContain(FEATURES_HOST);

    await extendedFeaturesApi.get('/ping');
    expect(lastUrl()).toContain(EXTENDED_HOST);

    await budgetsApi.get('/ping');
    expect(lastUrl()).toContain(BUDGETS_HOST);
  });

  it('preserves the /v1 stage prefix for a leading-slash endpoint', async () => {
    // Regression guard: new URL('/transactions', base) drops the base path
    // per the WHATWG URL spec, which silently removed the stage prefix.
    await api.get('/transactions');
    expect(lastUrl()).toBe(`https://${MAIN_HOST}/v1/transactions`);

    await extendedFeaturesApi.get('/receipt/usage');
    expect(lastUrl()).toBe(`https://${EXTENDED_HOST}/v1/receipt/usage`);
  });

  it('appends query parameters without losing the stage prefix', async () => {
    await api.get('/transactions', { month: 11, year: 2026 });
    expect(lastUrl()).toContain(`https://${MAIN_HOST}/v1/transactions?`);
    expect(lastUrl()).toContain('month=11');
    expect(lastUrl()).toContain('year=2026');
  });

  it('honours an explicit per-call baseUrl override', async () => {
    await api.get('/rules', undefined, { baseUrl: extendedFeaturesApiUrl });
    expect(lastUrl()).toContain(EXTENDED_HOST);
  });

  it('routes apiCall at the gateway it is given', async () => {
    await apiCall('/investments', { baseUrl: featuresApiUrl });
    expect(lastUrl()).toContain(FEATURES_HOST);

    await apiCall('/transactions');
    expect(lastUrl()).toContain(MAIN_HOST);
  });
});

describe('retry policy', () => {
  /** A fetch response the client treats as an error. */
  function failWith(status: number) {
    return {
      ok: false,
      status,
      statusText: 'error',
      json: async () => ({ message: `status ${status}` }),
    };
  }

  const originalDelay = API_CONFIG.retryDelay;

  beforeEach(() => {
    // The real backoff is 1s then 2s; what matters here is the attempt count.
    API_CONFIG.retryDelay = 0;
  });

  afterEach(() => {
    API_CONFIG.retryDelay = originalDelay;
  });

  it('does not replay a POST the server rejected with a 4xx', async () => {
    fetchMock.mockResolvedValue(failWith(409));

    await expect(
      api.post('/auth/onboarding', { city: 'Toronto' }),
    ).rejects.toMatchObject({ status: 409 });

    // A retried onboarding POST used to create the budget on attempt 1 and
    // then 409 twice, delaying the real answer by roughly three seconds.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not replay a 400 or a 403 either', async () => {
    fetchMock.mockResolvedValue(failWith(400));
    await expect(api.get('/transactions')).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockClear();
    fetchMock.mockResolvedValue(failWith(403));
    await expect(api.get('/transactions')).rejects.toMatchObject({ status: 403 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('still retries a 5xx up to retryAttempts', async () => {
    fetchMock.mockResolvedValue(failWith(500));

    await expect(api.get('/transactions')).rejects.toMatchObject({ status: 500 });

    expect(fetchMock).toHaveBeenCalledTimes(API_CONFIG.retryAttempts);
  });

  it('still retries a network failure, which carries no status', async () => {
    fetchMock.mockRejectedValue(new Error('Network request failed'));

    await expect(api.get('/transactions')).rejects.toBeDefined();

    expect(fetchMock).toHaveBeenCalledTimes(API_CONFIG.retryAttempts);
  });
});

describe('authorization header', () => {
  it('sends Bearer <token> read from the shared ID_TOKEN_KEY', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) =>
      key === ID_TOKEN_KEY ? 'the-real-token' : null,
    );

    await api.get('/transactions');

    expect(lastHeaders().Authorization).toBe('Bearer the-real-token');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(ID_TOKEN_KEY);
  });

  it('reads the mobile key, not the web one', () => {
    expect(ID_TOKEN_KEY).toBe('auth_id_token');
    expect(ID_TOKEN_KEY).not.toBe('budgetbuddy_id_token');
  });

  it('rejects before reaching fetch when no token is stored', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    await expect(api.get('/transactions')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
