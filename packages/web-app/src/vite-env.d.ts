/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** 'true' shows Google sign-in on /auth; anything else (or unset) hides it. */
  readonly VITE_ENABLE_GOOGLE_SIGNIN?: string;
  // Add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
