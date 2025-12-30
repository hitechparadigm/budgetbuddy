/**
 * Category Definitions
 * Hierarchical category system with parent categories and subcategories
 * Users can add/edit/delete both parent and subcategories
 */

export interface SubCategory {
  id: string;
  name: string;
  icon: string;
  isDefault: boolean; // Default subcategories can't be deleted
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: 'expense' | 'income';
  subcategories: SubCategory[];
  isDefault: boolean; // Default categories can't be deleted
}

/**
 * Default expense categories with subcategories
 */
export const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  {
    id: 'home',
    name: 'Home',
    icon: '🏠',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'home-rent', name: 'Rent/Mortgage', icon: '🏘️', isDefault: true },
      { id: 'home-insurance', name: 'Home Insurance', icon: '🛡️', isDefault: true },
      { id: 'home-utilities', name: 'Utilities', icon: '💡', isDefault: true },
      { id: 'home-maintenance', name: 'Maintenance', icon: '🔧', isDefault: true },
      { id: 'home-furniture', name: 'Furniture', icon: '🛋️', isDefault: true },
      { id: 'home-decor', name: 'Decor', icon: '🖼️', isDefault: true },
    ],
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: '🚗',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'transport-car-insurance', name: 'Car Insurance', icon: '🚙', isDefault: true },
      { id: 'transport-gas', name: 'Gas/Fuel', icon: '⛽', isDefault: true },
      { id: 'transport-public', name: 'Public Transportation', icon: '🚌', isDefault: true },
      { id: 'transport-taxi', name: 'Taxi/Rideshare', icon: '🚕', isDefault: true },
      { id: 'transport-car-service', name: 'Car Service/Maintenance', icon: '🔧', isDefault: true },
      { id: 'transport-parking', name: 'Parking', icon: '🅿️', isDefault: true },
    ],
  },
  {
    id: 'supermarket',
    name: 'Supermarket',
    icon: '🛒',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'supermarket-groceries', name: 'Groceries', icon: '🥬', isDefault: true },
      { id: 'supermarket-household', name: 'Household Items', icon: '🧹', isDefault: true },
      { id: 'supermarket-personal', name: 'Personal Care', icon: '🧴', isDefault: true },
      { id: 'supermarket-baby', name: 'Baby Products', icon: '👶', isDefault: true },
      { id: 'supermarket-pet', name: 'Pet Supplies', icon: '🐾', isDefault: true },
    ],
  },
  {
    id: 'food',
    name: 'Food',
    icon: '🍽️',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'food-restaurant', name: 'Restaurant', icon: '🍴', isDefault: true },
      { id: 'food-fast-food', name: 'Fast Food', icon: '🍔', isDefault: true },
      { id: 'food-coffee', name: 'Coffee/Cafe', icon: '☕', isDefault: true },
      { id: 'food-delivery', name: 'Food Delivery', icon: '🚚', isDefault: true },
      { id: 'food-snacks', name: 'Snacks', icon: '🍿', isDefault: true },
    ],
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: '🎬',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'entertainment-movies', name: 'Movies/Cinema', icon: '🎥', isDefault: true },
      { id: 'entertainment-streaming', name: 'Streaming Services', icon: '📺', isDefault: true },
      { id: 'entertainment-games', name: 'Games', icon: '🎮', isDefault: true },
      { id: 'entertainment-concerts', name: 'Concerts/Events', icon: '🎵', isDefault: true },
      { id: 'entertainment-hobbies', name: 'Hobbies', icon: '🎨', isDefault: true },
      { id: 'entertainment-books', name: 'Books/Magazines', icon: '📚', isDefault: true },
    ],
  },
  {
    id: 'clothing',
    name: 'Clothing',
    icon: '👕',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'clothing-clothes', name: 'Clothes', icon: '👔', isDefault: true },
      { id: 'clothing-shoes', name: 'Shoes', icon: '👟', isDefault: true },
      { id: 'clothing-accessories', name: 'Accessories', icon: '👜', isDefault: true },
      { id: 'clothing-jewelry', name: 'Jewelry', icon: '💍', isDefault: true },
      { id: 'clothing-laundry', name: 'Laundry/Dry Cleaning', icon: '🧺', isDefault: true },
    ],
  },
  {
    id: 'health',
    name: 'Health',
    icon: '⚕️',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'health-insurance', name: 'Health Insurance', icon: '🏥', isDefault: true },
      { id: 'health-doctor', name: 'Doctor Visits', icon: '👨‍⚕️', isDefault: true },
      { id: 'health-pharmacy', name: 'Pharmacy/Medications', icon: '💊', isDefault: true },
      { id: 'health-dental', name: 'Dental', icon: '🦷', isDefault: true },
      { id: 'health-vision', name: 'Vision/Optical', icon: '👓', isDefault: true },
      { id: 'health-fitness', name: 'Gym/Fitness', icon: '💪', isDefault: true },
    ],
  },
  {
    id: 'education',
    name: 'Education',
    icon: '📚',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'education-tuition', name: 'Tuition', icon: '🎓', isDefault: true },
      { id: 'education-books', name: 'Books/Supplies', icon: '📖', isDefault: true },
      { id: 'education-courses', name: 'Online Courses', icon: '💻', isDefault: true },
      { id: 'education-tutoring', name: 'Tutoring', icon: '👨‍🏫', isDefault: true },
      { id: 'education-childcare', name: 'Childcare/Daycare', icon: '👶', isDefault: true },
    ],
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: '✈️',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'travel-flights', name: 'Flights', icon: '🛫', isDefault: true },
      { id: 'travel-hotels', name: 'Hotels/Accommodation', icon: '🏨', isDefault: true },
      { id: 'travel-car-rental', name: 'Car Rental', icon: '🚗', isDefault: true },
      { id: 'travel-activities', name: 'Activities/Tours', icon: '🗺️', isDefault: true },
      { id: 'travel-vacation', name: 'Vacation Expenses', icon: '🏖️', isDefault: true },
    ],
  },
  {
    id: 'gifts',
    name: 'Gifts',
    icon: '🎁',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'gifts-birthday', name: 'Birthday Gifts', icon: '🎂', isDefault: true },
      { id: 'gifts-holiday', name: 'Holiday Gifts', icon: '🎄', isDefault: true },
      { id: 'gifts-wedding', name: 'Wedding Gifts', icon: '💒', isDefault: true },
      { id: 'gifts-charity', name: 'Charity/Donations', icon: '❤️', isDefault: true },
    ],
  },
  {
    id: 'work',
    name: 'Work',
    icon: '💼',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'work-supplies', name: 'Office Supplies', icon: '📎', isDefault: true },
      { id: 'work-equipment', name: 'Equipment', icon: '🖥️', isDefault: true },
      { id: 'work-lunch', name: 'Work Lunch', icon: '🥪', isDefault: true },
      { id: 'work-commute', name: 'Commute', icon: '🚇', isDefault: true },
      { id: 'work-professional', name: 'Professional Development', icon: '📈', isDefault: true },
    ],
  },
  {
    id: 'electronics',
    name: 'Electronics',
    icon: '📱',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'electronics-phone', name: 'Phone/Mobile', icon: '📱', isDefault: true },
      { id: 'electronics-computer', name: 'Computer/Laptop', icon: '💻', isDefault: true },
      { id: 'electronics-tablet', name: 'Tablet', icon: '📱', isDefault: true },
      { id: 'electronics-accessories', name: 'Accessories', icon: '🎧', isDefault: true },
      { id: 'electronics-repairs', name: 'Repairs', icon: '🔧', isDefault: true },
    ],
  },
  {
    id: 'sport',
    name: 'Sport',
    icon: '⚽',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'sport-gym', name: 'Gym Membership', icon: '🏋️', isDefault: true },
      { id: 'sport-equipment', name: 'Sports Equipment', icon: '🎾', isDefault: true },
      { id: 'sport-classes', name: 'Classes/Training', icon: '🤸', isDefault: true },
      { id: 'sport-events', name: 'Sporting Events', icon: '🏟️', isDefault: true },
    ],
  },
  {
    id: 'communications',
    name: 'Communications',
    icon: '📞',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'communications-phone', name: 'Phone Bill', icon: '📱', isDefault: true },
      { id: 'communications-internet', name: 'Internet', icon: '🌐', isDefault: true },
      { id: 'communications-cable', name: 'Cable/TV', icon: '📺', isDefault: true },
      { id: 'communications-subscriptions', name: 'Subscriptions', icon: '📰', isDefault: true },
    ],
  },
  {
    id: 'other-expense',
    name: 'Other',
    icon: '📦',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'other-expense-misc', name: 'Miscellaneous', icon: '🔖', isDefault: true },
      { id: 'other-expense-fees', name: 'Fees/Charges', icon: '💳', isDefault: true },
      { id: 'other-expense-taxes', name: 'Taxes', icon: '📋', isDefault: true },
    ],
  },
];

/**
 * Default income categories with subcategories
 */
export const DEFAULT_INCOME_CATEGORIES: Category[] = [
  {
    id: 'salary',
    name: 'Salary',
    icon: '💰',
    type: 'income',
    isDefault: true,
    subcategories: [
      { id: 'salary-primary', name: 'Primary Job', icon: '💼', isDefault: true },
      { id: 'salary-secondary', name: 'Secondary Job', icon: '👔', isDefault: true },
      { id: 'salary-bonus', name: 'Bonus', icon: '🎁', isDefault: true },
      { id: 'salary-commission', name: 'Commission', icon: '📈', isDefault: true },
      { id: 'salary-overtime', name: 'Overtime', icon: '⏰', isDefault: true },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    icon: '🏢',
    type: 'income',
    isDefault: true,
    subcategories: [
      { id: 'business-revenue', name: 'Business Revenue', icon: '💵', isDefault: true },
      { id: 'business-freelance', name: 'Freelance', icon: '💻', isDefault: true },
      { id: 'business-consulting', name: 'Consulting', icon: '📊', isDefault: true },
      { id: 'business-contract', name: 'Contract Work', icon: '📝', isDefault: true },
    ],
  },
  {
    id: 'investment',
    name: 'Investment',
    icon: '📈',
    type: 'income',
    isDefault: true,
    subcategories: [
      { id: 'investment-dividends', name: 'Dividends', icon: '💹', isDefault: true },
      { id: 'investment-interest', name: 'Interest', icon: '🏦', isDefault: true },
      { id: 'investment-capital-gains', name: 'Capital Gains', icon: '📊', isDefault: true },
      { id: 'investment-rental', name: 'Rental Income', icon: '🏠', isDefault: true },
    ],
  },
  {
    id: 'rewards',
    name: 'Rewards',
    icon: '🎁',
    type: 'income',
    isDefault: true,
    subcategories: [
      { id: 'rewards-cashback', name: 'Cashback', icon: '💳', isDefault: true },
      { id: 'rewards-points', name: 'Rewards Points', icon: '⭐', isDefault: true },
      { id: 'rewards-rebates', name: 'Rebates', icon: '💰', isDefault: true },
    ],
  },
  {
    id: 'gifts-income',
    name: 'Gifts',
    icon: '🎁',
    type: 'income',
    isDefault: true,
    subcategories: [
      { id: 'gifts-income-family', name: 'Family Gifts', icon: '👨‍👩‍👧', isDefault: true },
      { id: 'gifts-income-friends', name: 'Friends Gifts', icon: '🤝', isDefault: true },
      { id: 'gifts-income-inheritance', name: 'Inheritance', icon: '💎', isDefault: true },
    ],
  },
  {
    id: 'other-income',
    name: 'Other',
    icon: '💵',
    type: 'income',
    isDefault: true,
    subcategories: [
      { id: 'other-income-refund', name: 'Tax Refund', icon: '🧾', isDefault: true },
      { id: 'other-income-grant', name: 'Grant/Scholarship', icon: '🎓', isDefault: true },
      { id: 'other-income-misc', name: 'Miscellaneous', icon: '📦', isDefault: true },
    ],
  },
];

/**
 * Get all default categories (expense + income)
 */
export function getAllDefaultCategories(): Category[] {
  return [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
}

/**
 * Get categories by type
 */
export function getCategoriesByType(type: 'expense' | 'income'): Category[] {
  return type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;
}

/**
 * Find category by ID
 */
export function findCategoryById(categoryId: string): Category | undefined {
  return getAllDefaultCategories().find((cat) => cat.id === categoryId);
}

/**
 * Find subcategory by ID
 */
export function findSubcategoryById(
  categoryId: string,
  subcategoryId: string
): SubCategory | undefined {
  const category = findCategoryById(categoryId);
  return category?.subcategories.find((sub) => sub.id === subcategoryId);
}

/**
 * Get all subcategories for a category
 */
export function getSubcategories(categoryId: string): SubCategory[] {
  const category = findCategoryById(categoryId);
  return category?.subcategories || [];
}
