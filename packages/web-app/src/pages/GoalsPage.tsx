/**
 * Goals Page - Savings Goals Dashboard
 *
 * Displays savings goals with progress bars, contribution tracking,
 * milestone celebrations, and drag-and-drop reordering.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";
import { Confetti } from "../components/Confetti";

const API_BASE_URL =
  "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";

interface Goal {
  goalId: string;
  name: string;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  daysRemaining: number | null;
  priority: number;
  status: "active" | "completed" | "paused";
  statusIndicator: string;
  linkedCategoryId: string | null;
  progressPercent: number;
  monthlyRequired: number | null;
  milestones: Record<string, { reached: boolean; date: string | null }>;
  contributionCount: number;
  recentContributions: Array<{
    date: string;
    amount: number;
    source: string;
    note: string | null;
  }>;
  completedAt: string | null;
  createdAt: string;
}

interface GoalsSummary {
  activeGoals: number;
  totalTarget: number;
  totalSaved: number;
  overallProgress: number;
}

interface GoalsResponse {
  goals: Goal[];
  count: number;
  summary: GoalsSummary;
}

export const GoalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [summary, setSummary] = useState<GoalsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributing, setContributing] = useState(false);
  const [draggedGoal, setDraggedGoal] = useState<Goal | null>(null);
  const [dragOverGoalId, setDragOverGoalId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const dragCounter = useRef(0);
  const currency = "USD";

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("budgetbuddy_id_token");
      if (!token) {
        navigate("/auth");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/goals`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        navigate("/auth");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load goals");
      }

      const data = await response.json();
      const goalsData: GoalsResponse = data.data || data;
      setGoals(goalsData.goals || []);
      setSummary(goalsData.summary || null);
    } catch (err) {
      console.error("Error loading goals:", err);
      setError(err instanceof Error ? err.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleContribute = async () => {
    if (!selectedGoal || !contributionAmount) return;

    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setContributing(true);
      setError(null);

      const token = localStorage.getItem("budgetbuddy_id_token");
      if (!token) {
        navigate("/auth");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/goals/${selectedGoal.goalId}/contribute`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to add contribution");
      }

      const data = await response.json();

      // Show celebration for new milestones with confetti
      if (data.data?.newMilestones?.length > 0) {
        setShowConfetti(true);
        // Show message after a brief delay for confetti effect
        setTimeout(() => {
          alert(`🎉 ${data.data.newMilestones[0].message}`);
        }, 500);
      }

      // Reload goals
      await loadGoals();
      setShowContributeModal(false);
      setSelectedGoal(null);
      setContributionAmount("");
    } catch (err) {
      console.error("Error adding contribution:", err);
      setError(
        err instanceof Error ? err.message : "Failed to add contribution",
      );
    } finally {
      setContributing(false);
    }
  };

  const openContributeModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setContributionAmount("");
    setShowContributeModal(true);
  };

  // Drag and drop handlers for goal reordering
  const handleDragStart = (e: React.DragEvent, goal: Goal) => {
    setDraggedGoal(goal);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", goal.goalId);
    // Add a slight delay to show the dragging state
    setTimeout(() => {
      const element = e.target as HTMLElement;
      element.style.opacity = "0.5";
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const element = e.target as HTMLElement;
    element.style.opacity = "1";
    setDraggedGoal(null);
    setDragOverGoalId(null);
    dragCounter.current = 0;
  };

  const handleDragEnter = (e: React.DragEvent, goalId: string) => {
    e.preventDefault();
    dragCounter.current++;
    if (draggedGoal && draggedGoal.goalId !== goalId) {
      setDragOverGoalId(goalId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverGoalId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetGoal: Goal) => {
    e.preventDefault();
    setDragOverGoalId(null);
    dragCounter.current = 0;

    if (!draggedGoal || draggedGoal.goalId === targetGoal.goalId) {
      return;
    }

    // Calculate new order
    const draggedIndex = goals.findIndex(
      (g) => g.goalId === draggedGoal.goalId,
    );
    const targetIndex = goals.findIndex((g) => g.goalId === targetGoal.goalId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new array with reordered goals
    const newGoals = [...goals];
    const [removed] = newGoals.splice(draggedIndex, 1);
    newGoals.splice(targetIndex, 0, removed);

    // Update local state immediately for responsive UI
    setGoals(newGoals);

    // Build the new order array for API
    const goalOrder = newGoals.map((g, index) => ({
      goalId: g.goalId,
      priority: index + 1,
    }));

    // Call API to persist the new order
    try {
      setReordering(true);
      const token = localStorage.getItem("budgetbuddy_id_token");
      if (!token) {
        navigate("/auth");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/goals/reorder`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ goalOrder }),
      });

      if (!response.ok) {
        // Revert on failure
        await loadGoals();
        throw new Error("Failed to reorder goals");
      }
    } catch (err) {
      console.error("Error reordering goals:", err);
      setError(err instanceof Error ? err.message : "Failed to reorder goals");
    } finally {
      setReordering(false);
      setDraggedGoal(null);
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "bg-green-500";
    if (percent >= 75) return "bg-blue-500";
    if (percent >= 50) return "bg-yellow-500";
    if (percent >= 25) return "bg-orange-500";
    return "bg-gray-400";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Confetti Animation */}
      <Confetti
        active={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/budget")}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                🎯 Savings Goals
              </h1>
            </div>
            <button
              onClick={() => navigate("/goals/new")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Goal
            </button>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      {summary && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Active Goals</div>
              <div className="text-2xl font-bold text-gray-900">
                {summary.activeGoals}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Total Target</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.totalTarget, currency)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Total Saved</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalSaved, currency)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Overall Progress</div>
              <div className="text-2xl font-bold text-blue-600">
                {summary.overallProgress}%
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor(summary.overallProgress)} transition-all`}
                  style={{ width: `${summary.overallProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Goals List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {goals.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No goals yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first savings goal to start tracking your progress
            </p>
            <button
              onClick={() => navigate("/goals/new")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Create Your First Goal
            </button>
          </div>
        ) : (
          <>
            {goals.length > 1 && (
              <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                <span className="text-lg">↕️</span>
                Drag and drop goals to reorder by priority
                {reordering && (
                  <span className="ml-2 text-blue-600">Saving...</span>
                )}
              </p>
            )}
            <div className="space-y-4">
              {goals.map((goal) => (
                <div
                  key={goal.goalId}
                  draggable={goal.status === "active"}
                  onDragStart={(e) => handleDragStart(e, goal)}
                  onDragEnd={handleDragEnd}
                  onDragEnter={(e) => handleDragEnter(e, goal.goalId)}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, goal)}
                  className={`bg-white rounded-lg shadow p-6 transition-all duration-200 ${
                    goal.status === "completed"
                      ? "border-2 border-green-500"
                      : ""
                  } ${
                    goal.status === "active"
                      ? "cursor-grab active:cursor-grabbing"
                      : ""
                  } ${
                    dragOverGoalId === goal.goalId
                      ? "border-2 border-blue-500 border-dashed bg-blue-50"
                      : ""
                  } ${draggedGoal?.goalId === goal.goalId ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {goal.status === "active" && (
                        <span
                          className="text-gray-400 cursor-grab"
                          title="Drag to reorder"
                        >
                          ⋮⋮
                        </span>
                      )}
                      <span className="text-3xl">{goal.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          {goal.name}
                          <span className="text-xl">
                            {goal.statusIndicator}
                          </span>
                        </h3>
                        {goal.targetDate && (
                          <p className="text-sm text-gray-500">
                            Target: {formatDate(goal.targetDate)}
                            {goal.daysRemaining !== null && (
                              <span className="ml-2">
                                (
                                {goal.daysRemaining > 0
                                  ? `${goal.daysRemaining} days left`
                                  : "Past due"}
                                )
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    {goal.status === "active" && (
                      <button
                        onClick={() => openContributeModal(goal)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        + Add Funds
                      </button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        {formatCurrency(goal.currentAmount, currency)} of{" "}
                        {formatCurrency(goal.targetAmount, currency)}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {goal.progressPercent}%
                      </span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(goal.progressPercent)} transition-all duration-500`}
                        style={{ width: `${goal.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Milestones */}
                  <div className="flex gap-2 mb-4">
                    {[25, 50, 75, 100].map((milestone) => {
                      const reached =
                        goal.milestones?.[String(milestone)]?.reached;
                      return (
                        <div
                          key={milestone}
                          className={`flex-1 text-center py-1 rounded text-xs font-medium ${
                            reached
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {reached ? "✓" : ""} {milestone}%
                        </div>
                      );
                    })}
                  </div>

                  {/* Monthly Required */}
                  {goal.monthlyRequired && goal.status === "active" && (
                    <p className="text-sm text-blue-600">
                      💡 Save {formatCurrency(goal.monthlyRequired, currency)}
                      /month to reach your goal on time
                    </p>
                  )}

                  {/* Completed Badge */}
                  {goal.status === "completed" && goal.completedAt && (
                    <p className="text-sm text-green-600 font-medium">
                      🏆 Goal completed on {formatDate(goal.completedAt)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Contribute Modal */}
      {showContributeModal && selectedGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Funds to "{selectedGoal.name}"
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Current: {formatCurrency(selectedGoal.currentAmount, currency)}{" "}
                / Target: {formatCurrency(selectedGoal.targetAmount, currency)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowContributeModal(false);
                  setSelectedGoal(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleContribute}
                disabled={contributing || !contributionAmount}
                className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                  contributing || !contributionAmount
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {contributing ? "Adding..." : "Add Funds"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
