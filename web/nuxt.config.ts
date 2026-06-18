// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  modules: ["@nuxt/content"],

  // Statisches Hosting auf GitHub Pages.
  nitro: { preset: "github-pages" },

  // Bei Projekt-Pages (user.github.io/<repo>/) muss baseURL gesetzt sein.
  // Wird im Deploy-Workflow per NUXT_APP_BASE_URL gesetzt.
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || "/",
    head: {
      title: "Touch Lab",
      meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
    },
  },

  runtimeConfig: {
    public: {
      // /firmware-index.json liegt in web/public/ und wird von der CI aktualisiert.
      // Keine Cross-Origin-Probleme, funktioniert auch lokal.
      firmwareIndex: "/firmware-index.json",
      // Basis-URL des GitHub-Repos fuer Code-Download-Links.
      // Im Deploy per NUXT_PUBLIC_REPO_URL setzen (z.B. https://github.com/hfg-gmuend/touch).
      repoUrl: process.env.NUXT_PUBLIC_REPO_URL || "",
    },
  },

  content: {
    documentDriven: false,
    highlight: { theme: "github-dark" },
  },

  // esp-web-tools registriert Web-Components (<esp-web-install-button>).
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag.startsWith("esp-web-"),
    },
  },
});
