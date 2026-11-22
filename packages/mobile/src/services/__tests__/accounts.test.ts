/**
 * accounts service: GET /accounts on the main gateway, with the same response
 * tolerance as the web's accountsApi. `../api` is the global mock from
 * src/test/setup.ts.
 */
import { api, budgetsApi } from '../api';
import { fetchAccounts } from '../accounts';

const mockedApi = api as jest.Mocked<typeof api>;
const mockedBudgetsApi = budgetsApi as jest.Mocked<typeof budgetsApi>;

const CASH = {
  accountId: 'acc_cash',
  accountType: 'cash',
  accountSubtype: 'cash',
  nickname: 'Cash',
  institutionName: null,
  currentBalance: 0,
  currency: 'USD',
  isManual: true,
  isTracked: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchAccounts', () => {
  it('reads {success, data: {accounts}} from GET /accounts on the main gateway', async () => {
    mockedApi.get.mockResolvedValueOnce({
      status: 200,
      data: { success: true, data: { accounts: [CASH], count: 1 } },
    });

    await expect(fetchAccounts()).resolves.toEqual([CASH]);
    expect(mockedApi.get).toHaveBeenCalledWith('/accounts');
    expect(mockedBudgetsApi.get).not.toHaveBeenCalled();
  });

  it('reads an unwrapped {accounts} body', async () => {
    mockedApi.get.mockResolvedValueOnce({ status: 200, data: { accounts: [CASH] } });
    await expect(fetchAccounts()).resolves.toEqual([CASH]);
  });

  it('returns an empty list when the body has no accounts', async () => {
    mockedApi.get.mockResolvedValueOnce({ status: 200, data: { success: true, data: {} } });
    await expect(fetchAccounts()).resolves.toEqual([]);
  });
});
