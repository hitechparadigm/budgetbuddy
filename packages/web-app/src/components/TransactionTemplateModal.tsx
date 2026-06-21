/**
 * TransactionTemplateModal Component
 *
 * Allows users to save and use transaction templates for quick entry.
 * Features:
 * - Save current transaction as template
 * - View and manage saved templates
 * - Quick apply template to new transaction
 * - Recent categories tracking
 */

import React, { useState, useEffect } from "react";

export interface TransactionTemplate {
  id: string;
  name: string;
  description: string;
  amount: number | null; // null means user enters amount each time
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  type: "income" | "expense";
  createdAt: string;
  usageCount: number;
  lastUsed: string | null;
}

interface TransactionTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TransactionTemplate) => void;
  onSaveTemplate?: (
    template: Omit<
      TransactionTemplate,
      "id" | "createdAt" | "usageCount" | "lastUsed"
    >,
  ) => void;
  currentTransaction?: {
    description: string;
    amount: string;
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    type: "income" | "expense";
  };
  mode: "select" | "save";
}

const TEMPLATES_STORAGE_KEY = "budgetbuddy_transaction_templates";
const RECENT_CATEGORIES_KEY = "budgetbuddy_recent_categories";
const MAX_TEMPLATES = 20;
const MAX_RECENT_CATEGORIES = 5;

// Helper functions for localStorage
export function getStoredTemplates(): TransactionTemplate[] {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveTemplates(templates: TransactionTemplate[]): void {
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

export function getRecentCategories(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_CATEGORIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addRecentCategory(categoryId: string): void {
  const recent = getRecentCategories().filter((id) => id !== categoryId);
  recent.unshift(categoryId);
  localStorage.setItem(
    RECENT_CATEGORIES_KEY,
    JSON.stringify(recent.slice(0, MAX_RECENT_CATEGORIES)),
  );
}

export const TransactionTemplateModal: React.FC<
  TransactionTemplateModalProps
> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  onSaveTemplate,
  currentTransaction,
  mode,
}) => {
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [saveAmount, setSaveAmount] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">(
    "all",
  );

  useEffect(() => {
    if (isOpen) {
      setTemplates(getStoredTemplates());
      setTemplateName(currentTransaction?.description || "");
      setSaveAmount(true);
      setSearchQuery("");
    }
  }, [isOpen, currentTransaction]);

  if (!isOpen) return null;

  const handleSaveTemplate = () => {
    if (!currentTransaction || !templateName.trim()) return;

    const newTemplate: TransactionTemplate = {
      id: `template_${Date.now()}`,
      name: templateName.trim(),
      description: currentTransaction.description,
      amount: saveAmount ? parseFloat(currentTransaction.amount) || null : null,
      categoryId: currentTransaction.categoryId,
      categoryName: currentTransaction.categoryName,
      categoryIcon: currentTransaction.categoryIcon,
      type: currentTransaction.type,
      createdAt: new Date().toISOString(),
      usageCount: 0,
      lastUsed: null,
    };

    const updatedTemplates = [newTemplate, ...templates].slice(
      0,
      MAX_TEMPLATES,
    );
    saveTemplates(updatedTemplates);
    setTemplates(updatedTemplates);

    if (onSaveTemplate) {
      onSaveTemplate(newTemplate);
    }

    onClose();
  };

  const handleSelectTemplate = (template: TransactionTemplate) => {
    // Update usage stats
    const updatedTemplates = templates.map((t) =>
      t.id === template.id
        ? {
            ...t,
            usageCount: t.usageCount + 1,
            lastUsed: new Date().toISOString(),
          }
        : t,
    );
    saveTemplates(updatedTemplates);

    // Track recent category
    addRecentCategory(template.categoryId);

    onSelectTemplate(template);
    onClose();
  };

  const handleDeleteTemplate = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTemplates = templates.filter((t) => t.id !== templateId);
    saveTemplates(updatedTemplates);
    setTemplates(updatedTemplates);
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.categoryName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === "all" || t.type === filterType;

    return matchesSearch && matchesType;
  });

  // Sort by usage count (most used first), then by last used
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    if (a.lastUsed && b.lastUsed)
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    return 0;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-surface)] rounded-lg max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
            {mode === "save" ? "Save as Template" : "Transaction Templates"}
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--color-muted-foreground)] hover:text-[var(--color-muted-foreground)]"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === "save" ? (
            /* Save Template Form */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Weekly Groceries"
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[var(--color-primary)]"
                  autoFocus
                />
              </div>

              {currentTransaction && (
                <div className="bg-[var(--color-background)] rounded-lg p-3 space-y-2">
                  <div className="text-sm text-[var(--color-muted-foreground)]">Template Preview:</div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">
                      {currentTransaction.categoryIcon}
                    </span>
                    <div>
                      <div className="font-medium">
                        {currentTransaction.description}
                      </div>
                      <div className="text-sm text-[var(--color-muted-foreground)]">
                        {currentTransaction.categoryName}
                      </div>
                    </div>
                    {saveAmount && currentTransaction.amount && (
                      <div
                        className={`ml-auto font-medium ${currentTransaction.type === "income" ? "text-green-600" : "text-red-600"}`}
                      >
                        {currentTransaction.type === "income" ? "+" : "-"}$
                        {currentTransaction.amount}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={saveAmount}
                  onChange={(e) => setSaveAmount(e.target.checked)}
                  className="rounded border-[var(--color-border)] text-blue-600 focus:ring-[var(--color-primary)]"
                />
                <span className="text-sm text-[var(--color-foreground)]">
                  Save amount with template
                </span>
              </label>

              <p className="text-xs text-[var(--color-muted-foreground)]">
                {saveAmount
                  ? "The amount will be pre-filled when using this template."
                  : "You'll enter the amount each time you use this template."}
              </p>
            </div>
          ) : (
            /* Select Template View */
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-2.5 w-4 h-4 text-[var(--color-muted-foreground)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search templates..."
                    className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[var(--color-primary)] text-sm"
                  />
                </div>

                <div className="flex space-x-2">
                  {(["all", "income", "expense"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        filterType === type
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:bg-gray-200"
                      }`}
                    >
                      {type === "all"
                        ? "All"
                        : type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Templates List */}
              {sortedTemplates.length === 0 ? (
                <div className="text-center py-8 text-[var(--color-muted-foreground)]">
                  {templates.length === 0 ? (
                    <>
                      <p className="text-sm">No templates saved yet</p>
                      <p className="text-xs mt-1">
                        Save a transaction as a template to use it again quickly
                      </p>
                    </>
                  ) : (
                    <p className="text-sm">No templates match your search</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="w-full flex items-center space-x-3 p-3 bg-[var(--color-background)] rounded-lg hover:bg-[var(--color-muted)] transition-colors text-left group"
                    >
                      <span className="text-xl flex-shrink-0">
                        {template.categoryIcon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[var(--color-foreground)] truncate">
                          {template.name}
                        </div>
                        <div className="text-xs text-[var(--color-muted-foreground)] truncate">
                          {template.categoryName}
                          {template.usageCount > 0 && (
                            <span className="ml-2">
                              • Used {template.usageCount}x
                            </span>
                          )}
                        </div>
                      </div>
                      {template.amount !== null && (
                        <div
                          className={`text-sm font-medium flex-shrink-0 ${template.type === "income" ? "text-green-600" : "text-red-600"}`}
                        >
                          {template.type === "income" ? "+" : "-"}$
                          {template.amount.toFixed(2)}
                        </div>
                      )}
                      <button
                        onClick={(e) => handleDeleteTemplate(template.id, e)}
                        className="p-1 text-[var(--color-muted-foreground)] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        title="Delete template"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-[var(--color-background)]">
          {mode === "save" ? (
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-lg text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!templateName.trim()}
                className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Template
              </button>
            </div>
          ) : (
            <div className="text-xs text-[var(--color-muted-foreground)] text-center">
              {templates.length} template{templates.length !== 1 ? "s" : ""}{" "}
              saved
              {templates.length >= MAX_TEMPLATES && " (max reached)"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionTemplateModal;
