import React, { useState } from 'react';
import { getCategoriesByType, getCategoryById } from '../../../../shared/src/types/categories';

interface CategorySelectorProps {
  type: 'income' | 'expense';
  selectedCategoryId: string;
  onCategorySelect: (categoryId: string, categoryName: string) => void;
  error?: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  type,
  selectedCategoryId,
  onCategorySelect,
  error
}) => {
  const [showCategories, setShowCategories] = useState(false);

  // Get categories from unified system
  const categories = getCategoriesByType(type);
  const selectedCategory = getCategoryById(selectedCategoryId);

  const handleCategoryClick = (category: any) => {
    onCategorySelect(category.id, category.name);
    setShowCategories(false);
  };

  return (
    <div className="relative">
      {/* Selected Category Display */}
      <button
        type="button"
        onClick={() => setShowCategories(!showCategories)}
        className={`w-full flex items-center justify-between p-3 rounded-lg border ${
          error ? 'border-red-500' : 'border-gray-600'
        } bg-gray-800 text-white hover:bg-gray-700 transition-colors`}
      >
        {selectedCategory ? (
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full ${selectedCategory.color} flex items-center justify-center text-white text-sm`}>
              {selectedCategory.icon}
            </div>
            <span className="font-medium">{selectedCategory.name}</span>
          </div>
        ) : (
          <span className="text-gray-400">Select a category</span>
        )}
        <span className="text-gray-400">
          {showCategories ? '▲' : '▼'}
        </span>
      </button>

      {error && <span className="text-red-500 text-sm mt-1 block">{error}</span>}

      {/* Category Grid */}
      {showCategories && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Category</h3>
              <button
                onClick={() => setShowCategories(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryClick(category)}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    selectedCategoryId === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${category.color} flex items-center justify-center text-white text-sm`}>
                    {category.icon}
                  </div>
                  <span className="font-medium">{category.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelector;
