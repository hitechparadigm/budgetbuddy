/**
 * Goal Form Page - Create/Edit Savings Goal
 *
 * Form for creating new goals or editing existing ones.
 * Includes name, target amount, target date, icon, and category linking.
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';

interface GoalTemplate {
  id: string;
  name: string;
  icon: string;
  suggestedAmount: number | null;
}

interface GoalFormData {
  name: string;
  icon: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  linkedCategoryId: string;
}

const ICONS = [
  "🎯",
  "🚨",
  "✈️",
  "🚗",
  "🏠",
  "💍",
  "🎓",
  "💻",
  "🎁",
  "💰",
  "🏖️",
  "🎮",
  "📱",
  "👶",
  "🐕",
];

export const GoalFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { goalId } = useParams<{ goalId?: string }>();
  const isEditing = !!goalId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const [form, setForm] = useState<GoalFormData>({
    name: "",
    icon: "🎯",
    targetAmount: "",
    currentAmount: "0",
    targetDate: "",
    linkedCategoryId: "",
  });

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const token = localStorage.getItem("budgetbuddy_id_token");
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/goals/templates`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTemplates(data.data?.templates || []);
        }
      } catch (err) {
        console.error("Error loading templates:", err);
      }
    };

    loadTemplates();
  }, []);

  // Load existing goal if editing
  useEffect(() => {
    if (!goalId) return;

    const loadGoal = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("budgetbuddy_id_token");
        if (!token) {
          navigate("/auth");
          return;
        }

        const response = await fetch(`${API_BASE_URL}/goals/${goalId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          const goal = data.data;

          if (goal) {
            setForm({
              name: goal.name,
              icon: goal.icon,
              targetAmount: goal.targetAmount.toString(),
              currentAmount: goal.currentAmount.toString(),
              targetDate: goal.targetDate || "",
              linkedCategoryId: goal.linkedCategoryId || "",
            });
          } else {
            setError("Goal not found");
          }
        }
      } catch (err) {
        console.error("Error loading goal:", err);
        setError("Failed to load goal");
      } finally {
        setLoading(false);
      }
    };

    loadGoal();
  }, [goalId, navigate]);

  const handleTemplateSelect = (template: GoalTemplate) => {
    setForm({
      ...form,
      name: template.name,
      icon: template.icon,
      targetAmount: template.suggestedAmount?.toString() || "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.name.trim()) {
      setError("Goal name is required");
      return;
    }
    if (!form.targetAmount || parseFloat(form.targetAmount) <= 0) {
      setError("Valid target amount is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem("budgetbuddy_id_token");
      if (!token) {
        navigate("/auth");
        return;
      }

      const payload = {
        name: form.name.trim(),
        icon: form.icon,
        targetAmount: parseFloat(form.targetAmount),
        currentAmount: parseFloat(form.currentAmount) || 0,
        targetDate: form.targetDate || null,
        linkedCategoryId: form.linkedCategoryId || null,
      };

      const url = isEditing
        ? `${API_BASE_URL}/goals/${goalId}`
        : `${API_BASE_URL}/goals`;

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save goal");
      }

      navigate("/goals");
    } catch (err) {
      console.error("Error saving goal:", err);
      setError(err instanceof Error ? err.message : "Failed to save goal");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/goals")}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditing ? "Edit Goal" : "New Goal"}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Templates (only for new goals) */}
        {!isEditing && templates.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Quick Start Templates
            </h3>
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <span>{template.icon}</span>
                  <span className="text-sm">{template.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow p-6 space-y-6"
        >
          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-16 h-16 text-3xl bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
              >
                {form.icon}
              </button>
              {showIconPicker && (
                <div className="absolute top-20 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10">
                  <div className="grid grid-cols-5 gap-2">
                    {ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, icon });
                          setShowIconPicker(false);
                        }}
                        className={`w-10 h-10 text-xl rounded hover:bg-gray-100 ${
                          form.icon === icon ? "bg-blue-100" : ""
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Goal Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Goal Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Emergency Fund, Vacation, New Car"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Target Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Amount *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={form.targetAmount}
                onChange={(e) =>
                  setForm({ ...form, targetAmount: e.target.value })
                }
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Current Amount (for editing or starting with existing savings) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Starting Amount (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.currentAmount}
                onChange={(e) =>
                  setForm({ ...form, currentAmount: e.target.value })
                }
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              If you already have some savings toward this goal
            </p>
          </div>

          {/* Target Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Date (Optional)
            </label>
            <input
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Setting a target date helps calculate your monthly savings goal
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate("/goals")}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                saving
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {saving ? "Saving..." : isEditing ? "Update Goal" : "Create Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalFormPage;
