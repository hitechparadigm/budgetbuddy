/**
 * useTemplates Hook
 * Manages transaction templates stored in AsyncStorage
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TEMPLATES_KEY = 'budgetbuddy_transaction_templates';
const RECENT_CATEGORIES_KEY = 'budgetbuddy_recent_categories';
const MAX_TEMPLATES = 10;
const MAX_RECENT_CATEGORIES = 5;

export interface TransactionTemplate {
  id: string;
  name: string;
  description: string;
  amount: number;
  categoryId: string;
  createdAt: string;
}

interface TemplateStorage {
  templates: TransactionTemplate[];
  recentCategories: string[];
}

export interface UseTemplatesReturn {
  /** List of saved templates */
  templates: TransactionTemplate[];
  /** List of recently used category IDs */
  recentCategories: string[];
  /** Whether templates are loading */
  isLoading: boolean;
  /** Save a new template */
  saveTemplate: (template: Omit<TransactionTemplate, 'id' | 'createdAt'>) => Promise<void>;
  /** Delete a template by ID */
  deleteTemplate: (id: string) => Promise<void>;
  /** Update an existing template */
  updateTemplate: (id: string, updates: Partial<TransactionTemplate>) => Promise<void>;
  /** Add a category to recent list */
  addRecentCategory: (categoryId: string) => Promise<void>;
  /** Clear all templates */
  clearTemplates: () => Promise<void>;
  /** Refresh templates from storage */
  refresh: () => Promise<void>;
}

/**
 * Generate a unique ID for templates
 */
function generateId(): string {
  return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hook for managing transaction templates
 */
export function useTemplates(): UseTemplatesReturn {
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [recentCategories, setRecentCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load templates from AsyncStorage
   */
  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true);

      const [templatesJson, categoriesJson] = await Promise.all([
        AsyncStorage.getItem(TEMPLATES_KEY),
        AsyncStorage.getItem(RECENT_CATEGORIES_KEY),
      ]);

      if (templatesJson) {
        const parsed = JSON.parse(templatesJson) as TransactionTemplate[];
        setTemplates(parsed);
      }

      if (categoriesJson) {
        const parsed = JSON.parse(categoriesJson) as string[];
        setRecentCategories(parsed);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Save templates to AsyncStorage
   */
  const saveTemplates = useCallback(async (newTemplates: TransactionTemplate[]) => {
    try {
      await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(newTemplates));
      setTemplates(newTemplates);
    } catch (error) {
      console.error('Failed to save templates:', error);
      throw error;
    }
  }, []);

  /**
   * Save recent categories to AsyncStorage
   */
  const saveRecentCategories = useCallback(async (categories: string[]) => {
    try {
      await AsyncStorage.setItem(RECENT_CATEGORIES_KEY, JSON.stringify(categories));
      setRecentCategories(categories);
    } catch (error) {
      console.error('Failed to save recent categories:', error);
      throw error;
    }
  }, []);

  /**
   * Save a new template
   */
  const saveTemplate = useCallback(async (
    template: Omit<TransactionTemplate, 'id' | 'createdAt'>
  ) => {
    const newTemplate: TransactionTemplate = {
      ...template,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    // Check max templates limit
    let updatedTemplates = [...templates, newTemplate];
    if (updatedTemplates.length > MAX_TEMPLATES) {
      // Remove oldest templates
      updatedTemplates = updatedTemplates
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, MAX_TEMPLATES);
    }

    await saveTemplates(updatedTemplates);
  }, [templates, saveTemplates]);

  /**
   * Delete a template by ID
   */
  const deleteTemplate = useCallback(async (id: string) => {
    const updatedTemplates = templates.filter(t => t.id !== id);
    await saveTemplates(updatedTemplates);
  }, [templates, saveTemplates]);

  /**
   * Update an existing template
   */
  const updateTemplate = useCallback(async (
    id: string,
    updates: Partial<TransactionTemplate>
  ) => {
    const updatedTemplates = templates.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    await saveTemplates(updatedTemplates);
  }, [templates, saveTemplates]);

  /**
   * Add a category to recent list
   */
  const addRecentCategory = useCallback(async (categoryId: string) => {
    // Remove if already exists, then add to front
    const filtered = recentCategories.filter(id => id !== categoryId);
    const updated = [categoryId, ...filtered].slice(0, MAX_RECENT_CATEGORIES);
    await saveRecentCategories(updated);
  }, [recentCategories, saveRecentCategories]);

  /**
   * Clear all templates
   */
  const clearTemplates = useCallback(async () => {
    await AsyncStorage.multiRemove([TEMPLATES_KEY, RECENT_CATEGORIES_KEY]);
    setTemplates([]);
    setRecentCategories([]);
  }, []);

  /**
   * Refresh templates from storage
   */
  const refresh = useCallback(async () => {
    await loadTemplates();
  }, [loadTemplates]);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    recentCategories,
    isLoading,
    saveTemplate,
    deleteTemplate,
    updateTemplate,
    addRecentCategory,
    clearTemplates,
    refresh,
  };
}

export default useTemplates;
