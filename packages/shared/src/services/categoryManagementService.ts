/**
 * Category Management Service
 * Handles CRUD operations for user categories and subcategories
 * Users can add/edit/delete custom categories while preserving defaults
 */

import {
  Category,
  SubCategory,
  getAllDefaultCategories,
  findCategoryById,
} from '../data/categoryDefinitions';

export interface UserCategoryData {
  categories: Category[];
  lastModified: string;
}

/**
 * Add a new custom category
 */
export function addCategory(
  currentCategories: Category[],
  newCategory: Omit<Category, 'id' | 'isDefault'>
): Category[] {
  const id = generateCategoryId(newCategory.name);
  const category: Category = {
    ...newCategory,
    id,
    isDefault: false,
    subcategories: [],
  };

  return [...currentCategories, category];
}

/**
 * Edit an existing category
 * Default categories can only edit name and icon, not delete
 */
export function editCategory(
  currentCategories: Category[],
  categoryId: string,
  updates: Partial<Pick<Category, 'name' | 'icon'>>
): Category[] {
  return currentCategories.map((cat) => {
    if (cat.id === categoryId) {
      return { ...cat, ...updates };
    }
    return cat;
  });
}

/**
 * Delete a category
 * Only custom categories (isDefault: false) can be deleted
 */
export function deleteCategory(
  currentCategories: Category[],
  categoryId: string
): { categories: Category[]; success: boolean; error?: string } {
  const category = currentCategories.find((cat) => cat.id === categoryId);

  if (!category) {
    return {
      categories: currentCategories,
      success: false,
      error: 'Category not found',
    };
  }

  if (category.isDefault) {
    return {
      categories: currentCategories,
      success: false,
      error: 'Cannot delete default category',
    };
  }

  return {
    categories: currentCategories.filter((cat) => cat.id !== categoryId),
    success: true,
  };
}

/**
 * Add a subcategory to a category
 */
export function addSubcategory(
  currentCategories: Category[],
  categoryId: string,
  newSubcategory: Omit<SubCategory, 'id' | 'isDefault'>
): Category[] {
  return currentCategories.map((cat) => {
    if (cat.id === categoryId) {
      const id = generateSubcategoryId(categoryId, newSubcategory.name);
      const subcategory: SubCategory = {
        ...newSubcategory,
        id,
        isDefault: false,
      };

      return {
        ...cat,
        subcategories: [...cat.subcategories, subcategory],
      };
    }
    return cat;
  });
}

/**
 * Edit a subcategory
 */
export function editSubcategory(
  currentCategories: Category[],
  categoryId: string,
  subcategoryId: string,
  updates: Partial<Pick<SubCategory, 'name' | 'icon'>>
): Category[] {
  return currentCategories.map((cat) => {
    if (cat.id === categoryId) {
      return {
        ...cat,
        subcategories: cat.subcategories.map((sub) => {
          if (sub.id === subcategoryId) {
            return { ...sub, ...updates };
          }
          return sub;
        }),
      };
    }
    return cat;
  });
}

/**
 * Delete a subcategory
 * Only custom subcategories (isDefault: false) can be deleted
 */
export function deleteSubcategory(
  currentCategories: Category[],
  categoryId: string,
  subcategoryId: string
): { categories: Category[]; success: boolean; error?: string } {
  const category = currentCategories.find((cat) => cat.id === categoryId);
  if (!category) {
    return {
      categories: currentCategories,
      success: false,
      error: 'Category not found',
    };
  }

  const subcategory = category.subcategories.find((sub) => sub.id === subcategoryId);
  if (!subcategory) {
    return {
      categories: currentCategories,
      success: false,
      error: 'Subcategory not found',
    };
  }

  if (subcategory.isDefault) {
    return {
      categories: currentCategories,
      success: false,
      error: 'Cannot delete default subcategory',
    };
  }

  return {
    categories: currentCategories.map((cat) => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          subcategories: cat.subcategories.filter((sub) => sub.id !== subcategoryId),
        };
      }
      return cat;
    }),
    success: true,
  };
}

/**
 * Initialize user categories with defaults
 */
export function initializeUserCategories(): UserCategoryData {
  return {
    categories: getAllDefaultCategories(),
    lastModified: new Date().toISOString(),
  };
}

/**
 * Merge user categories with defaults
 * Ensures new default categories are added while preserving user customizations
 */
export function mergeWithDefaults(userCategories: Category[]): Category[] {
  const defaults = getAllDefaultCategories();
  const userCategoryIds = new Set(userCategories.map((cat) => cat.id));

  // Add any new default categories that user doesn't have
  const newDefaults = defaults.filter((def) => !userCategoryIds.has(def.id));

  return [...userCategories, ...newDefaults];
}

/**
 * Generate a unique category ID from name
 */
function generateCategoryId(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const timestamp = Date.now().toString(36);
  return `${base}-${timestamp}`;
}

/**
 * Generate a unique subcategory ID
 */
function generateSubcategoryId(categoryId: string, name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const timestamp = Date.now().toString(36);
  return `${categoryId}-${base}-${timestamp}`;
}

/**
 * Validate category name
 */
export function validateCategoryName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Category name cannot be empty' };
  }

  if (name.length > 50) {
    return { valid: false, error: 'Category name must be 50 characters or less' };
  }

  return { valid: true };
}

/**
 * Check if category name already exists
 */
export function categoryNameExists(
  categories: Category[],
  name: string,
  excludeId?: string
): boolean {
  return categories.some(
    (cat) => cat.name.toLowerCase() === name.toLowerCase() && cat.id !== excludeId
  );
}

/**
 * Check if subcategory name already exists within a category
 */
export function subcategoryNameExists(
  category: Category,
  name: string,
  excludeId?: string
): boolean {
  return category.subcategories.some(
    (sub) => sub.name.toLowerCase() === name.toLowerCase() && sub.id !== excludeId
  );
}
