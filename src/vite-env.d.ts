/// <reference types="vite/client" />

/** Typed access to the Vite env vars this app reads (import.meta.env). */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_MANAGER_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
