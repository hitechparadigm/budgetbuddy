import React, { useState, useEffect } from "react";

interface NotificationPreferences {
  budgetAlertsEnabled: boolean;
  dailyRemindersEnabled: boolean;
  reminderTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
}

interface NotificationSettingsProps {
  userId: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  userId,
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    budgetAlertsEnabled: true,
    dailyRemindersEnabled: true,
    reminderTime: "19:00",
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/notifications/preferences?userId=${userId}`,
      );

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
      setMessage({
        type: "error",
        text: "Failed to load notification preferences",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      setMessage(null);

      // Validate time formats
      if (!isValidTimeFormat(preferences.reminderTime)) {
        setMessage({
          type: "error",
          text: "Invalid reminder time format. Use HH:mm (e.g., 19:00)",
        });
        return;
      }
      if (
        !isValidTimeFormat(preferences.quietHoursStart) ||
        !isValidTimeFormat(preferences.quietHoursEnd)
      ) {
        setMessage({
          type: "error",
          text: "Invalid quiet hours format. Use HH:mm (e.g., 22:00)",
        });
        return;
      }

      const response = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          preferences,
        }),
      });

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Notification preferences saved successfully!",
        });
      } else {
        setMessage({ type: "error", text: "Failed to save preferences" });
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      setMessage({ type: "error", text: "Failed to save preferences" });
    } finally {
      setSaving(false);
    }
  };

  const isValidTimeFormat = (time: string): boolean => {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
  };

  const handleToggle = (
    field: "budgetAlertsEnabled" | "dailyRemindersEnabled",
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleTimeChange = (
    field: "reminderTime" | "quietHoursStart" | "quietHoursEnd",
    value: string,
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <div className="notification-settings">
        <h3>Notification Preferences</h3>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="notification-settings">
      <h3>Notification Preferences</h3>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <div className="setting-group">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={preferences.budgetAlertsEnabled}
            onChange={() => handleToggle("budgetAlertsEnabled")}
          />
          <span className="toggle-text">Budget Alerts</span>
        </label>
        <p className="setting-description">
          Receive alerts when spending reaches 80%, 90%, or 100% of your budget
        </p>
      </div>

      <div className="setting-group">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={preferences.dailyRemindersEnabled}
            onChange={() => handleToggle("dailyRemindersEnabled")}
          />
          <span className="toggle-text">Daily Reminders</span>
        </label>
        <p className="setting-description">
          Receive daily reminders to log your expenses
        </p>
      </div>

      <div className="setting-group">
        <label htmlFor="reminderTime">Reminder Time</label>
        <input
          id="reminderTime"
          type="time"
          value={preferences.reminderTime}
          onChange={(e) => handleTimeChange("reminderTime", e.target.value)}
          className="time-input"
        />
        <p className="setting-description">
          Time of day to receive daily reminders (24-hour format)
        </p>
      </div>

      <div className="setting-group">
        <label>Quiet Hours</label>
        <div className="time-range">
          <input
            type="time"
            value={preferences.quietHoursStart}
            onChange={(e) =>
              handleTimeChange("quietHoursStart", e.target.value)
            }
            className="time-input"
          />
          <span className="time-separator">to</span>
          <input
            type="time"
            value={preferences.quietHoursEnd}
            onChange={(e) => handleTimeChange("quietHoursEnd", e.target.value)}
            className="time-input"
          />
        </div>
        <p className="setting-description">
          No notifications will be sent during these hours
        </p>
      </div>

      <button
        onClick={savePreferences}
        disabled={saving}
        className="save-button"
      >
        {saving ? "Saving..." : "Save Preferences"}
      </button>

      <style jsx>{`
        .notification-settings {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }

        h3 {
          margin-bottom: 20px;
          font-size: 24px;
          font-weight: 600;
        }

        .message {
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .message.success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message.error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .setting-group {
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e0e0e0;
        }

        .setting-group:last-of-type {
          border-bottom: none;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
        }

        .toggle-label input[type="checkbox"] {
          width: 20px;
          height: 20px;
          margin-right: 12px;
          cursor: pointer;
        }

        .toggle-text {
          user-select: none;
        }

        .setting-description {
          margin-top: 8px;
          font-size: 14px;
          color: #666;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .time-input {
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 16px;
        }

        .time-range {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .time-separator {
          color: #666;
        }

        .save-button {
          padding: 12px 24px;
          background-color: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .save-button:hover:not(:disabled) {
          background-color: #45a049;
        }

        .save-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
