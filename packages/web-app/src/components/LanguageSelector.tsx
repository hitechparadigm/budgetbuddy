/**
 * Language Selector Component
 *
 * Allows users to select their preferred language for the app interface.
 * Note: Full i18n implementation would require additional setup with react-i18next.
 */

import React, { useState, useRef, useEffect } from "react";

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
];

interface LanguageSelectorProps {
  value?: string;
  onChange?: (languageCode: string) => void;
  variant?: "dropdown" | "list";
  showNativeName?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  variant = "dropdown",
  showNativeName = true,
}) => {
  const STORAGE_KEY = "budgetbuddy_language";
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    value || localStorage.getItem(STORAGE_KEY) || "en",
  );
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === selectedLanguage,
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    localStorage.setItem(STORAGE_KEY, languageCode);
    setIsOpen(false);

    if (onChange) {
      onChange(languageCode);
    }

    // In a real app, this would trigger i18n language change
    // i18n.changeLanguage(languageCode);
  };

  if (variant === "list") {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Language
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Select your preferred language
          </p>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {SUPPORTED_LANGUAGES.map((language) => (
            <button
              key={language.code}
              onClick={() => handleSelect(language.code)}
              className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                selectedLanguage === language.code
                  ? "bg-green-50 dark:bg-green-900/20"
                  : ""
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{language.flag}</span>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {language.name}
                  </p>
                  {showNativeName && language.name !== language.nativeName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {language.nativeName}
                    </p>
                  )}
                </div>
              </div>
              {selectedLanguage === language.code && (
                <svg
                  className="w-5 h-5 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Note: Language support is coming soon. Currently, the app is
            available in English only.
          </p>
        </div>
      </div>
    );
  }

  // Dropdown variant
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">{currentLanguage?.flag}</span>
          <span className="text-sm text-gray-900 dark:text-white">
            {currentLanguage?.name}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          {SUPPORTED_LANGUAGES.map((language) => (
            <button
              key={language.code}
              onClick={() => handleSelect(language.code)}
              className={`w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                selectedLanguage === language.code
                  ? "bg-green-50 dark:bg-green-900/20"
                  : ""
              }`}
              role="option"
              aria-selected={selectedLanguage === language.code}
            >
              <span className="text-lg">{language.flag}</span>
              <div className="flex-1 text-left">
                <span className="text-sm text-gray-900 dark:text-white">
                  {language.name}
                </span>
                {showNativeName && language.name !== language.nativeName && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    ({language.nativeName})
                  </span>
                )}
              </div>
              {selectedLanguage === language.code && (
                <svg
                  className="w-4 h-4 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
