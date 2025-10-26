/**
 * Category Manager Component
 * Handles adding, editing, deleting, and reordering budget categories
 */
import React, { useState } from 'react';
import { Category, BudgetGroup } from '../../contexts/BudgetContext';

// ============================================================================
// Types
// ============================================================================

interface CategoryManagerProps {
  group: BudgetGroup;
  groupType: 'income' | 'savings' | 'expenses';
  onUpdateGroup: (updatedGroup: BudgetGroup) => void;
  onClose: () => void;
}

interface CategoryFormData {
  categoryName: string;
  plannedAmount: number;
  icon: string;
  colorCode: string;
}

// ============================================================================
// Predefined Category Templates
// ============================================================================

const CATEGORY_TEMPLATES = {
  income: [
    { name: 'Salary', icon: '💼', color: '#10B981' },
    { name: 'Freelance', icon: '💻', color: '#059669' },
    { name: 'Side Hustle', icon: '🚀', color: '#047857' },
    { name: 'Investment Income', icon: '📈', color: '#065F46' },
    { name: 'Rental Income', icon: '🏠', color: '#064E3B' },
    { name: 'Other Income', icon: '💰', color: '#10B981' },
  ],
  savings: [
    { name: 'Emergency Fund', icon: '🛡️', color: '#3B82F6' },
    { name: 'Retirement (401k)', icon: '🏦', color: '#2563EB' },
    { name: 'Vacation Fund', icon: '✈️', color: '#1D4ED8' },
    { name: 'House Down Payment', icon: '🏡', color: '#1E40AF' },
    { name: 'Car Fund', icon: '🚗', color: '#1E3A8A' },
    { name: 'Education Fund', icon: '🎓', color: '#312E81' },
  ],
  expenses: [
    { name: 'Rent/Mortgage', icon: '🏠', color: '#F59E0B' },
    { name: 'Groceries', icon: '🛒', color: '#D97706' },
    { name: 'Utilities', icon: '⚡', color: '#B45309' },
    { name: 'Transportation', icon: '🚗', color: '#92400E' },
    { name: 'Insurance', icon: '🛡️', color: '#78350F' },
    { name: 'Phone', icon: '📱', color: '#F59E0B' },
    { name: 'Internet', icon: '🌐', color: '#D97706' },
    { name: 'Entertainment', icon: '🎬', color: '#B45309' },
    { name: 'Dining Out', icon: '🍽️', color: '#92400E' },
    { name: 'Clothing', icon: '👕', color: '#78350F' },
    { name: 'Healthcare', icon: '🏥', color: '#F59E0B' },
    { name: 'Personal Care', icon: '💄', color: '#D97706' },
  ],
};

const AVAILABLE_ICONS = [
  '💼', '💻', '🚀', '📈', '🏠', '💰', '🛡️', '🏦', '✈️', '🏡', '🚗', '🎓',
  '🛒', '⚡', '📱', '🌐', '🎬', '🍽️', '👕', '🏥', '💄', '🎯', '📊', '💡',
  '🔧', '🎨', '📚', '🎵', '🏃', '🧘', '🍕', '☕', '🎮', '📺', '🛍️', '💊'
];

const AVAILABLE_COLORS = [
  '#10B981', '#059669', '#047857', '#065F46', '#064E3B',
  '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A',
  '#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F',
  '#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D',
  '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95',
  '#EC4899', '#DB2777', '#BE185D', '#9D174D', '#831843'
];

// ============================================================================
// Category Manager Component
// ============================================================================

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  group,
  groupType,
  onUpdateGroup,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'existing' | 'templates' | 'custom'>('existing');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    categoryName: '',
    plannedAmount: 0,
    icon: '📊',
    colorCode: AVAILABLE_COLORS[0],
  });

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleAddFromTemplate = (template: { name: string; icon: string; color: string }) => {
    const newCategory: Category = {
      categoryId: generateCategoryId(),
      categoryName: template.name,
      parentGroup: group.groupName,
      groupType: groupType === 'savings' ? 'saving' : groupType === 'expenses' ? 'expense' : 'income',
      categoryOrder: group.categories.length,
      icon: template.icon,
      colorCode: template.color,
      plannedAmount: 0,
      spentAmount: 0,
      remainingAmount: 0,
      isCustom: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const updatedGroup = {
      ...group,
      categories: [...group.categories, newCategory],
    };

    onUpdateGroup(updatedGroup);
  };

  const handleAddCustomCategory = () => {
    if (!formData.categoryName.trim()) return;

    const newCategory: Category = {
      categoryId: generateCategoryId(),
      categoryName: formData.categoryName,
      parentGroup: group.groupName,
      groupType: groupType === 'savings' ? 'saving' : groupType === 'expenses' ? 'expense' : 'income',
      categoryOrder: group.categories.length,
      icon: formData.icon,
      colorCode: formData.colorCode,
      plannedAmount: formData.plannedAmount,
      spentAmount: 0,
      remainingAmount: formData.plannedAmount,
      isCustom: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const updatedGroup = {
      ...group,
      categories: [...group.categories, newCategory],
    };

    onUpdateGroup(updatedGroup);

    // Reset form
    setFormData({
      categoryName: '',
      plannedAmount: 0,
      icon: '📊',
      colorCode: AVAILABLE_COLORS[0],
    });
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      categoryName: category.categoryName,
      plannedAmount: category.plannedAmount,
      icon: category.icon,
      colorCode: category.colorCode,
    });
    setActiveTab('custom');
  };

  const handleUpdateCategory = () => {
    if (!editingCategory || !formData.categoryName.trim()) return;

    const updatedCategories = group.categories.map(cat =>
      cat.categoryId === editingCategory.categoryId
        ? {
          ...cat,
          categoryName: formData.categoryName,
          plannedAmount: formData.plannedAmount,
          remainingAmount: formData.plannedAmount - cat.spentAmount,
          icon: formData.icon,
          colorCode: formData.colorCode,
        }
        : cat
    );

    const updatedGroup = {
      ...group,
      categories: updatedCategories,
    };

    onUpdateGroup(updatedGroup);
    setEditingCategory(null);
    setFormData({
      categoryName: '',
      plannedAmount: 0,
      icon: '📊',
      colorCode: AVAILABLE_COLORS[0],
    });
  };

  const handleDeleteCategory = (categoryId: string) => {
    const updatedCategories = group.categories.filter(cat => cat.categoryId !== categoryId);
    const updatedGroup = {
      ...group,
      categories: updatedCategories,
    };
    onUpdateGroup(updatedGroup);
  };

  const handleMoveCategory = (categoryId: string, direction: 'up' | 'down') => {
    const categories = [...group.categories];
    const index = categories.findIndex(cat => cat.categoryId === categoryId);

    if (direction === 'up' && index > 0) {
      [categories[index], categories[index - 1]] = [categories[index - 1], categories[index]];
    } else if (direction === 'down' && index < categories.length - 1) {
      [categories[index], categories[index + 1]] = [categories[index + 1], categories[index]];
    }

    // Update category orders
    categories.forEach((cat, idx) => {
      cat.categoryOrder = idx;
    });

    const updatedGroup = {
      ...group,
      categories,
    };

    onUpdateGroup(updatedGroup);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Manage Categories - {group.groupName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'existing', label: 'Existing Categories', count: group.categories.length },
              { key: 'templates', label: 'Templates', count: CATEGORY_TEMPLATES[groupType].length },
              { key: 'custom', label: editingCategory ? 'Edit Category' : 'Add Custom' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-96">
          {/* Existing Categories Tab */}
          {activeTab === 'existing' && (
            <div>
              {group.categories.length > 0 ? (
                <div className="space-y-3">
                  {group.categories.map((category, index) => (
                    <div
                      key={category.categoryId}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{category.icon}</span>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {category.categoryName}
                          </h4>
                          <p className="text-xs text-gray-500">
                            ${category.plannedAmount.toLocaleString()} planned
                            {category.isCustom && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Custom
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Move buttons */}
                        <button
                          onClick={() => handleMoveCategory(category.categoryId, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMoveCategory(category.categoryId, 'down')}
                          disabled={index === group.categories.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {/* Edit button */}
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteCategory(category.categoryId)}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📋</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Categories Yet
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Add categories from templates or create custom ones.
                  </p>
                  <div className="space-x-3">
                    <button
                      onClick={() => setActiveTab('templates')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Browse Templates
                    </button>
                    <button
                      onClick={() => setActiveTab('custom')}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Create Custom
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Common {groupType} categories
                </h4>
                <p className="text-sm text-gray-500">
                  Click to add a category to your budget. You can customize it later.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {CATEGORY_TEMPLATES[groupType].map((template, index) => (
                  <button
                    key={index}
                    onClick={() => handleAddFromTemplate(template)}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-2xl">{template.icon}</span>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{template.name}</p>
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: template.color }}
                      ></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Category Tab */}
          {activeTab === 'custom' && (
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  {editingCategory ? 'Edit Category' : 'Create Custom Category'}
                </h4>
                <p className="text-sm text-gray-500">
                  {editingCategory ? 'Update the category details below.' : 'Add a custom category with your own name, icon, and color.'}
                </p>
              </div>
              <div className="space-y-4">
                {/* Category Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={formData.categoryName}
                    onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter category name"
                  />
                </div>

                {/* Planned Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Planned Amount
                  </label>
                  <input
                    type="number"
                    value={formData.plannedAmount}
                    onChange={(e) => setFormData({ ...formData, plannedAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Icon Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {AVAILABLE_ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`p-2 text-2xl border rounded-md hover:border-blue-300 ${formData.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="grid grid-cols-10 gap-2">
                    {AVAILABLE_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, colorCode: color })}
                        className={`w-8 h-8 rounded-full border-2 ${formData.colorCode === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setEditingCategory(null);
                      setFormData({
                        categoryName: '',
                        plannedAmount: 0,
                        icon: '📊',
                        colorCode: AVAILABLE_COLORS[0],
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingCategory ? handleUpdateCategory : handleAddCustomCategory}
                    disabled={!formData.categoryName.trim()}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {editingCategory ? 'Update Category' : 'Add Category'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

function generateCategoryId(): string {
  return `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
