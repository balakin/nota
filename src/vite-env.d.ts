/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.po' {
  const messages: import('@lingui/core').Messages;
  export { messages };
}
