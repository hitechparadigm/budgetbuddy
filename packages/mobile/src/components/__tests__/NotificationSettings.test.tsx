/**
 * NotificationSettings — every call goes through the authenticated client.
 *
 * GET/PUT /notifications/preferences and POST /notifications/register-device
 * sit behind the Cognito authorizer. The component used raw fetch with only a
 * Content-Type header, so all three returned 401. This renders the REAL
 * component with the REAL services/api client (the global mock is lifted);
 * only fetch and the SecureStore token read are stubbed, so the assertions see
 * the exact headers and bodies sent.
 */
import React from "react";
import { Alert, Switch } from "react-native";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import NotificationSettings from "../NotificationSettings";

jest.unmock("../../services/api");

const ID_TOKEN = "test-id-token";
const ALLOWED_FIELDS = [
  "budgetAlertsEnabled",
  "dailyRemindersEnabled",
  "reminderTime",
  "quietHoursStart",
  "quietHoursEnd",
  "timezone",
];

type FetchCall = { url: string; method: string; headers: Record<string, string>; body?: string };
let fetchMock: jest.Mock;

function calls(): FetchCall[] {
  return fetchMock.mock.calls.map(([url, init]) => ({
    url: String(url),
    method: init?.method,
    headers: init?.headers ?? {},
    body: init?.body,
  }));
}

function jsonResponse(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(ID_TOKEN);
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "undetermined" });
  fetchMock = jest.fn((url: string) =>
    url.includes("/notifications/preferences")
      ? jsonResponse({
          success: true,
          data: {
            budgetAlertsEnabled: false,
            dailyRemindersEnabled: true,
            reminderTime: "07:30",
            quietHoursStart: "22:00",
            quietHoursEnd: "08:00",
            updatedAt: "2026-11-20T00:00:00.000Z",
          },
        })
      : jsonResponse({ success: true, data: { success: true } }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("NotificationSettings", () => {
  it("loads preferences with the bearer token and no userId query", async () => {
    render(<NotificationSettings userId="user-123" />);
    // The first request in the file waits on cold module setup, so allow longer than 1 s.
    await waitFor(() => expect(calls().some((c) => c.method === "GET")).toBe(true), {
      timeout: 5000,
    });

    const get = calls().find((c) => c.method === "GET")!;
    expect(get.url).toMatch(/\/notifications\/preferences$/);
    expect(get.url).not.toContain("userId");
    expect(get.headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
  });

  it("saves only allowlisted fields with the bearer token", async () => {
    const screen = render(<NotificationSettings userId="user-123" />);
    await waitFor(() => expect(screen.UNSAFE_getAllByType(Switch).length).toBeGreaterThan(0), {
      timeout: 5000,
    });

    fireEvent(screen.UNSAFE_getAllByType(Switch)[0], "valueChange", true);

    await waitFor(() => expect(calls().some((c) => c.method === "PUT")).toBe(true));
    const put = calls().find((c) => c.method === "PUT")!;
    expect(put.url).toMatch(/\/notifications\/preferences$/);
    expect(put.headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
    const body = JSON.parse(put.body!);
    expect(Object.keys(body).every((key) => ALLOWED_FIELDS.includes(key))).toBe(true);
    expect(body).not.toHaveProperty("userId");
    expect(body).not.toHaveProperty("updatedAt");
    expect(body.budgetAlertsEnabled).toBe(true);
    // the device zone rides along so the server reads the reminder hour in it
    expect(body.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it("registers the device with the bearer token and no userId", async () => {
    const screen = render(<NotificationSettings userId="user-123" />);
    await waitFor(() => expect(screen.getByText("Enable Notifications")).toBeTruthy(), {
      timeout: 5000,
    });

    fireEvent.press(screen.getByText("Enable Notifications"));

    await waitFor(() =>
      expect(calls().some((c) => c.url.endsWith("/notifications/register-device"))).toBe(true),
    );
    const post = calls().find((c) => c.url.endsWith("/notifications/register-device"))!;
    expect(post.method).toBe("POST");
    expect(post.headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
    const body = JSON.parse(post.body!);
    expect(body.deviceToken).toBe("test-token");
    expect(body.platform).toBeDefined();
    expect(body).not.toHaveProperty("userId");
  });
});
