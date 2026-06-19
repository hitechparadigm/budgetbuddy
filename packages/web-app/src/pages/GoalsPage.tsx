/**
 * Goals Page - Savings Goals Dashboard
 *
 * Displays savings goals with progress rings, contribution tracking,
 * milestone celebrations, and drag-and-drop reordering.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";
import { Confetti } from "../components/Confetti";
import { profileApi } from "../services/api";
import { PageHeader, EmptyState } from "../components/ui";
import { Plus, PenLine, Trash2, Archive, ArchiveRestore } from "lucide-react";

/** SVG circular progress ring for goal cards */
const ProgressRing: React.FC<{
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
}> = ({ percent, size = 72, stroke = 7, color }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(Math.max(percent, 0), 100);
  const offset = circumference - (clampedPct / 100) * circumference;

  const ringColor =
    color ??
    (clampedPct >= 100
      ? '#22c55e'
      : clampedPct >= 75
      ? '#3b82f6'
      : clampedPct >= 50
      ? '#f59e0b'
      : clampedPct >= 25
      ? '#f97316'
      : '#9ca3af');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      className="rotate-[-90deg]"
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-[var(--color-muted)]"
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={ringColor}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';

interface Goal {
  goalId: string;
  name: string;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  daysRemaining: number | null;
  priority: number;
  status: "active" | "completed" | "paused" | "archived";
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
  const [milestoneMessage, setMilestoneMessage] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archiving, setArchiving] = useState<string | null>(null);
  // Controlled delete confirmation state (replaces window.confirm)
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [currency, setCurrency] = useState<string>("USD");
  const dragCounter = useRef(0);

  // Separate active and archived goals
  const activeGoals = goals.filter((g) => g.status !== "archived");
  const archivedGoals = goals.filter((g) => g.status === "archived");

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
    // Load user's currency preference from profile
    profileApi.getProfile().then((profile) => {
      if (profile?.currency) setCurrency(profile.currency);
    }).catch(() => { /* keep default USD */ });
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
        setMilestoneMessage(`🎉 ${data.data.newMilestones[0].message}`);
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

  // Delete goal permanently — opens controlled confirmation modal
  const handleDeleteGoal = (goal: Goal) => {
    setGoalToDelete(goal);
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    const goal = goalToDelete;
    setGoalToDelete(null);

    try {
      setError(null);
      const token = localStorage.getItem("budgetbuddy_id_token");
      if (!token) {
        navigate("/auth");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/goals/${goal.goalId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to delete goal");
      await loadGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete goal");
    }
  };

  // Archive/restore goal
  const handleArchiveGoal = async (goal: Goal, archive: boolean) => {
    try {
      setArchiving(goal.goalId);
      setError(null);

      const token = localStorage.getItem("budgetbuddy_id_token");
      if (!token) {
        navigate("/auth");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/goals/${goal.goalId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: archive
            ? "archived"
            : goal.progressPercent >= 100
              ? "completed"
              : "active",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${archive ? "archive" : "restore"} goal`);
      }

      // Reload goals
      await loadGoals();
    } catch (err) {
      console.error(`Error ${archive ? "archiving" : "restoring"} goal:`, err);
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${archive ? "archive" : "restore"} goal`,
      );
    } finally {
      setArchiving(null);
    }
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
      <div className="min-h-screen bg-background">
        <header className="bg-surface shadow-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="h-8 w-48 rounded animate-pulse bg-muted" />
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-lg animate-pulse bg-muted" />)}
          </div>
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-surface rounded-lg border border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full animate-pulse bg-muted" />
                  <div className="space-y-2 flex-1">
                    <div className="h-5 w-40 rounded animate-pulse bg-muted" />
                    <div className="h-3 w-24 rounded animate-pulse bg-muted" />
                  </div>
                </div>
                <div className="h-4 w-full rounded-full animate-pulse bg-muted mb-2" />
                <div className="flex justify-between">
                  <div className="h-3 w-20 rounded animate-pulse bg-muted" />
                  <div className="h-3 w-20 rounded animate-pulse bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Confetti Animation */}
      <Confetti
        active={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />

      {/* Milestone celebration notification (replaces window.alert) */}
      {milestoneMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-surface border border-green-300 dark:border-green-700 rounded-xl shadow-lg px-6 py-4 flex items-center gap-3 max-w-sm"
        >
          <span className="text-2xl" aria-hidden="true">🎉</span>
          <p className="text-green-800 dark:text-green-300 font-medium text-sm flex-1">{milestoneMessage}</p>
          <button
            onClick={() => setMilestoneMessage(null)}
            className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
            aria-label="Dismiss milestone notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate("/budget")}
            aria-label="Back to Budget"
            className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded mb-2"
          >
            ← Back
          </button>
          <PageHeader
            title="🎯 Savings Goals"
            action={
              <button
                onClick={() => navigate("/goals/new")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + New Goal
              </button>
            }
          />
        </div>
      </header>

      {/* Summary Cards */}
      {summary && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface rounded-lg shadow border border-border p-4">
              <div className="text-sm text-muted-foreground">Active Goals</div>
              <div className="text-2xl font-bold text-foreground">
                {summary.activeGoals}
              </div>
            </div>
            <div className="bg-surface rounded-lg shadow border border-border p-4">
              <div className="text-sm text-muted-foreground">Total Target</div>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(summary.totalTarget, currency)}
              </div>
            </div>
            <div className="bg-surface rounded-lg shadow border border-border p-4">
              <div className="text-sm text-muted-foreground">Total Saved</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalSaved, currency)}
              </div>
            </div>
            <div className="bg-surface rounded-lg shadow border border-border p-4">
              <div className="text-sm text-muted-foreground">Overall Progress</div>
              <div className="text-2xl font-bold text-blue-600">
                {summary.overallProgress}%
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
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
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Goals Card Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {activeGoals.length === 0 && archivedGoals.length === 0 ? (
          <EmptyState
            icon="🎯"
            title="No goals yet"
            description="Create your first savings goal to start tracking your progress"
            actionLabel="Create Your First Goal"
            onAction={() => navigate('/goals/new')}
          />
        ) : (
          <>
            {activeGoals.length > 1 && reordering && (
              <p className="text-sm text-muted-foreground mb-4">
                <span className="ml-2 text-[var(--color-primary)]">Saving order...</span>
              </p>
            )}
            {/* Card grid — 1 col mobile, 2 col tablet, 3 col desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeGoals.map((goal) => (
                <div
                  key={goal.goalId}
                  draggable={goal.status === "active"}
                  onDragStart={(e) => handleDragStart(e, goal)}
                  onDragEnd={handleDragEnd}
                  onDragEnter={(e) => handleDragEnter(e, goal.goalId)}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, goal)}
                  className={`bg-surface rounded-xl shadow border transition-all duration-200 p-5 flex flex-col ${
                    goal.status === "completed" ? "border-green-500" : "border-border"
                  } ${
                    dragOverGoalId === goal.goalId
                      ? "border-[var(--color-primary)] border-dashed bg-[var(--color-primary)]/5"
                      : ""
                  } ${draggedGoal?.goalId === goal.goalId ? "opacity-50 cursor-grabbing" : goal.status === "active" ? "cursor-grab" : ""}`}
                >
                  {/* Card header — icon + name + action buttons */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xl shrink-0" aria-hidden="true">{goal.icon}</span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {goal.name}
                        </h3>
                        {goal.targetDate && (
                          <p className="text-xs text-muted-foreground">
                            {goal.daysRemaining !== null && goal.daysRemaining > 0
                              ? `${goal.daysRemaining}d left`
                              : goal.daysRemaining === 0
                              ? 'Due today'
                              : 'Past due'
                            }
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {goal.status === "active" && (
                        <>
                          <button
                            onClick={() => navigate(`/goals/${goal.goalId}/edit`)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                            aria-label={`Edit ${goal.name}`}
                          >
                            <PenLine className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            aria-label={`Delete ${goal.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {(goal.status === "completed" || goal.status === "paused") && (
                        <button
                          onClick={() => handleArchiveGoal(goal, true)}
                          disabled={archiving === goal.goalId}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                          aria-label={`Archive ${goal.name}`}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress ring + amounts — centered */}
                  <div className="flex flex-col items-center my-2">
                    <div className="relative">
                      <ProgressRing
                        percent={goal.progressPercent}
                        size={88}
                        stroke={8}
                        aria-label={`${goal.name} progress: ${goal.progressPercent}%`}
                      />
                      {/* Percent label in center */}
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        aria-hidden="true"
                      >
                        <span className="text-sm font-bold text-foreground tabular-nums">
                          {goal.progressPercent}%
                        </span>
                      </div>
                    </div>
                    <div
                      className="text-center mt-2"
                      role="progressbar"
                      aria-valuenow={goal.progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${goal.name}: ${goal.progressPercent}% of ${formatCurrency(goal.targetAmount, currency)}`}
                    >
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatCurrency(goal.currentAmount, currency)}
                        <span className="mx-1 text-[var(--color-muted-foreground)]/50">/</span>
                        {formatCurrency(goal.targetAmount, currency)}
                      </p>
                    </div>
                  </div>

                  {/* Milestones row */}
                  <div className="flex gap-1 my-3">
                    {[25, 50, 75, 100].map((milestone) => {
                      const reached = goal.milestones?.[String(milestone)]?.reached;
                      return (
                        <div
                          key={milestone}
                          className={`flex-1 text-center py-0.5 rounded text-xs font-medium ${
                            reached
                              ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {reached ? '✓' : ''} {milestone}%
                        </div>
                      );
                    })}
                  </div>

                  {/* Monthly required tip */}
                  {goal.monthlyRequired && goal.status === "active" && (
                    <p className="text-xs text-[var(--color-primary)] mb-3">
                      Save {formatCurrency(goal.monthlyRequired, currency)}/mo to hit target
                    </p>
                  )}

                  {/* Completed badge */}
                  {goal.status === "completed" && goal.completedAt && (
                    <p className="text-xs text-green-600 font-medium mb-3">
                      🏆 Completed {formatDate(goal.completedAt)}
                    </p>
                  )}

                  {/* Add funds CTA — pushed to bottom */}
                  {goal.status === "active" && (
                    <button
                      onClick={() => openContributeModal(goal)}
                      className="mt-auto w-full py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    >
                      <Plus className="w-4 h-4 inline mr-1" aria-hidden="true" />
                      Add Funds
                    </button>
                  )}

                </div>
              ))}
            </div>

            {/* Archived Goals Section */}
            {archivedGoals.length > 0 && (
              <div className="mt-8">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
                >
                  <span
                    className={`transition-transform ${showArchived ? "rotate-90" : ""}`}
                  >
                    ▶
                  </span>
                  <span className="text-sm font-medium">
                    Archived Goals ({archivedGoals.length})
                  </span>
                </button>

                {showArchived && (
                  <div className="space-y-4">
                    {archivedGoals.map((goal) => (
                      <div
                        key={goal.goalId}
                        className="bg-muted rounded-lg shadow border border-border p-6 opacity-75"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl grayscale">
                              {goal.icon}
                            </span>
                            <div>
                              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                {goal.name}
                                <span className="text-sm text-muted-foreground">
                                  📦 Archived
                                </span>
                              </h3>
                              {goal.completedAt && (
                                <p className="text-sm text-muted-foreground">
                                  Completed: {formatDate(goal.completedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleArchiveGoal(goal, false)}
                            disabled={archiving === goal.goalId}
                            className="p-1.5 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors"
                            aria-label={`Restore ${goal.name}`}
                            title="Restore goal"
                          >
                            {archiving === goal.goalId ? (
                              <span className="animate-spin inline-block">⏳</span>
                            ) : (
                              <ArchiveRestore className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(goal.currentAmount, currency)} of{" "}
                              {formatCurrency(goal.targetAmount, currency)}
                            </span>
                            <span className="font-semibold text-muted-foreground">
                              {goal.progressPercent}%
                            </span>
                          </div>
                          <div className="h-3 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gray-500 transition-all duration-500"
                              style={{ width: `${goal.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Contribute Modal */}
      {showContributeModal && selectedGoal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="contribute-modal-title"
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 id="contribute-modal-title" className="text-lg font-semibold text-foreground mb-4">
              Add Funds to "{selectedGoal.name}"
            </h3>
            <div className="mb-4">
              <label htmlFor="contribution-amount" className="block text-sm font-medium text-foreground mb-2">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-2 text-muted-foreground" aria-hidden="true">$</span>
                <input
                  id="contribution-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2 border border-border bg-surface text-foreground rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
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
                className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleContribute}
                disabled={contributing || !contributionAmount}
                className={`flex-1 px-4 py-2 rounded-lg font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
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

      {/* Delete Confirmation Modal — replaces window.confirm */}
      {goalToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-goal-title"
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 id="delete-goal-title" className="text-lg font-semibold text-foreground mb-2">
              Delete "{goalToDelete.name}"?
            </h3>
            <p className="text-muted-foreground mb-6 text-sm">
              This will permanently delete the goal and all its contribution history. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setGoalToDelete(null)}
                className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                autoFocus
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteGoal}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Delete Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
