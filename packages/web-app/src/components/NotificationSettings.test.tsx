/**
 * NotificationSettings and the sign-in time-zone sync (Wave 3 phase 1):
 * the web reports the device time zone inside the nested `preferences`
 * object the server parses, and the reminder picker offers whole hours.
 * Renders the real component and calls the real notificationsApi; only fetch,
 * the stored token and the device zone are stubbed.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { NotificationSettings } from "./NotificationSettings";
import { notificationsApi } from "../services/notificationsApi";
import { getDeviceTimeZone } from "../utils/timezoneHelpers";

jest.mock("../utils/timezoneHelpers", () => ({
  ...jest.requireActual("../utils/timezoneHelpers"),
  getDeviceTimeZone: jest.fn(),
}));

const mockedZone = getDeviceTimeZone as jest.Mock;
const TOKEN = "test-id-token";

type Call = { url: string; method: string; body?: string; auth?: string | null };
let fetchMock: jest.Mock;
const calls = (): Call[] =>
  fetchMock.mock.calls.map(([url, init]) => {
    const headers = init?.headers;
    const auth = headers instanceof Headers
      ? headers.get("Authorization")
      : headers?.Authorization ?? null;
    return { url: String(url), method: init?.method ?? "GET", body: init?.body, auth };
  });

function respondWith(stored: Record<string, unknown>) {
  fetchMock = jest.fn(async (_url: string, init?: RequestInit) => ({
    ok: true,
    status: 200,
    json: async () =>
      init?.method === "PUT" ? { success: true, data: { success: true } } : { success: true, data: stored },
  }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem("budgetbuddy_id_token", TOKEN);
  mockedZone.mockReturnValue("America/Toronto");
  respondWith({
    budgetAlertsEnabled: true,
    dailyRemindersEnabled: true,
    reminderTime: "19:30",
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    timezone: "UTC",
  });
});

describe("NotificationSettings", () => {
  it("offers the reminder time in whole hours and shows a stored 19:30 as 19:00", async () => {
    render(<NotificationSettings userId="user-1" />);

    const picker = (await screen.findByLabelText("Reminder Time")) as HTMLSelectElement;
    expect(picker.tagName).toBe("SELECT");
    expect(picker.options).toHaveLength(24);
    expect(picker.options[0].value).toBe("00:00");
    expect(picker.options[23].value).toBe("23:00");
    expect(picker.value).toBe("19:00");
  });

  it("saves the device time zone and a whole-hour reminder inside the nested preferences", async () => {
    render(<NotificationSettings userId="user-1" />);
    const picker = await screen.findByLabelText("Reminder Time");
    await userEvent.selectOptions(picker, "07:00");

    await userEvent.click(screen.getByRole("button", { name: "Save Preferences" }));

    await waitFor(() => expect(calls().some((c) => c.method === "PUT")).toBe(true));
    const put = calls().find((c) => c.method === "PUT")!;
    expect(put.auth).toBe(`Bearer ${TOKEN}`);
    const body = JSON.parse(put.body!);
    expect(body.preferences).toMatchObject({
      reminderTime: "07:00",
      timezone: "America/Toronto",
      dailyRemindersEnabled: true,
    });
  });

  it("leaves timezone out when the browser cannot report one", async () => {
    mockedZone.mockReturnValue(undefined);
    respondWith({ reminderTime: "19:00" });
    render(<NotificationSettings userId="user-1" />);
    await screen.findByLabelText("Reminder Time");

    await userEvent.click(screen.getByRole("button", { name: "Save Preferences" }));

    await waitFor(() => expect(calls().some((c) => c.method === "PUT")).toBe(true));
    const body = JSON.parse(calls().find((c) => c.method === "PUT")!.body!);
    expect(body.preferences).not.toHaveProperty("timezone");
  });
});

describe("notificationsApi.syncTimezone (called after sign-in)", () => {
  it("PUTs only { preferences: { timezone } } when the stored zone differs", async () => {
    await expect(notificationsApi.syncTimezone()).resolves.toBe(true);

    const [get, put] = calls();
    expect(get.method).toBe("GET");
    expect(get.url).toMatch(/\/notifications\/preferences$/);
    expect(put.method).toBe("PUT");
    expect(put.auth).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(put.body!)).toEqual({ preferences: { timezone: "America/Toronto" } });
  });

  it("sends nothing when the stored zone already matches", async () => {
    respondWith({ timezone: "America/Toronto" });

    await expect(notificationsApi.syncTimezone()).resolves.toBe(false);
    expect(calls().map((c) => c.method)).toEqual(["GET"]);
  });

  it("sends nothing without a device zone or a token, and never throws", async () => {
    mockedZone.mockReturnValue(undefined);
    await expect(notificationsApi.syncTimezone()).resolves.toBe(false);

    mockedZone.mockReturnValue("America/Toronto");
    localStorage.removeItem("budgetbuddy_id_token");
    await expect(notificationsApi.syncTimezone()).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();

    localStorage.setItem("budgetbuddy_id_token", TOKEN);
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(notificationsApi.syncTimezone()).resolves.toBe(false);
  });
});
