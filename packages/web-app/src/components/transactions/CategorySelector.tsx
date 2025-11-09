import React, { useState } from 'react';
import { getCategoriesByType, getCategoryById } from '../../../../shared/src/types/categories';

interface CategorySelectorProps {
  type: 'income' | 'expense';
  selectedCategoryId: string;
  onCategorySelect: (categoryId: string, categoryName: string) => void;
  error?: string;
  theme?: 'light' | 'dark';
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  type,
  selectedCategoryId,
  onCategorySelect,
  error,
  theme = 'dark'
}) => {
  const [showCategories, setShowCategories] = useState(false);

  // Get categories from unified system
  const categories = getCategoriesByType(type);
  const selectedCategory = getCategoryById(selectedCategoryId);

  const handleCategoryClick = (category: any) => {
    onCategorySelect(category.id, category.name);
    setShowCategories(false);
  };

  // TEMPORARY FIX: Force dark theme for category selector to ensure visibility
  const effectiveTheme = 'dark'; // Force dark theme until theme context is fixed

  console.log('CategorySelector theme:', effectiveTheme); // Debug log

  // Theme-aware styles with forced contrast
  const buttonStyle = {
    backgroundColor: effectiveTheme === 'dark' ? '#1f2937' : '#ffffff',
    color: effectiveTheme === 'dark' ? '#ffffff' : '#1f2937',
    borderColor: error ? '#ef4444' : (effectiveTheme === 'dark' ? '#4b5563' : '#d1d5db'),
    border: '2px solid'
  };

  const dropdownStyle = {
    backgroundColor: effectiveTheme === 'dark' ? '#1f2937' : '#ffffff',
    borderColor: effectiveTheme === 'dark' ? '#4b5563' : '#d1d5db',
    border: '2px solid'
  };

  return (
    <div className="relative">
      {/* Selected Category Display */}
      <button
        type="button"
        onClick={() => setShowCategories(!showCategories)}
        className="w-full flex items-center justify-between p-3 rounded-lg border hover:opacity-90 transition-colors"
        style={buttonStyle}
      >
        {selectedCategory ? (
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full ${selectedCategory.color} flex items-center justify-center text-white text-sm`}>
              {selectedCategory.icon}
            </div>
            <span className="font-medium">{selectedCategory.name}</span>
          </div>
        ) : (
          <span style={{ color: effectiveTheme === 'dark' ? '#9ca3af' : '#6b7280' }}>Select a category</span>
        )}
        <span style={{ color: effectiveTheme === 'dark' ? '#9ca3af' : '#6b7280' }}>
          {showCategories ? '▲' : '▼'}
        </span>
      </button>

      {error && <span className="text-red-500 text-sm mt-1 block">{error}</span>}

      {/* Category Grid */}
      {showCategories && (
        <div
          className="absolute top-full left-0 right-0 mt-2 border rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto"
          style={dropdownStyle}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3
                className="font-medium"
                style={{ color: effectiveTheme === 'dark' ? '#ffffff' : '#1f2937' }}
              >
                Category
              </h3>
              <button
                onClick={() => setShowCategories(false)}
                style={{ color: effectiveTheme === 'dark' ? '#9ca3af' : '#6b7280' }}
                className="hover:opacity-75"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {categories.map((category) => {
                const isSelected = selectedCategoryId === category.id;
                const buttonBg = isSelected
                  ? '#2563eb'
                  : (effectiveTheme === 'dark' ? '#374151' : '#f3f4f6');
                const buttonColor = isSelected
                  ? '#ffffff'
                  : (effectiveTheme === 'dark' ? '#ffffff' : '#1f2937');

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryClick(category)}
                    className="flex items-center space-x-3 p-3 rounded-lg transition-colors hover:opacity-90"
                    style={{ backgroundColor: buttonBg, color: buttonColor }}
                  >
                  <div className={`w-8 h-8 rounded-full ${category.color} flex items-center justify-center text-white text-sm`}>
                    {category.icon}
                  </div>
                    <span className="font-medium">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelector;
