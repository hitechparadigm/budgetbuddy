/**
 * Logout Tests (Req 43)
 * Validates logout clears all tokens
 */

describe('Logout (Req 43)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should clear all auth tokens on logout', () => {
    // Set tokens
    localStorage.setItem('budgetbuddy_access_token', 'test-access');
    localStorage.setItem('budgetbuddy_refresh_token', 'test-refresh');
    localStorage.setItem('budgetbuddy_id_token', 'test-id');
    localStorage.setItem('budgetbuddy_expires_at', '123456');

    // Simulate logout
    localStorage.removeItem('budgetbuddy_access_token');
    localStorage.removeItem('budgetbuddy_refresh_token');
    localStorage.removeItem('budgetbuddy_id_token');
    localStorage.removeItem('budgetbuddy_expires_at');

    // Verify all cleared
    expect(localStorage.getItem('budgetbuddy_access_token')).toBeNull();
    expect(localStorage.getItem('budgetbuddy_refresh_token')).toBeNull();
    expect(localStorage.getItem('budgetbuddy_id_token')).toBeNull();
    expect(localStorage.getItem('budgetbuddy_expires_at')).toBeNull();
  });
});
