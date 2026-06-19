// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  // Global, framework-free stylesheet (tokens + base + cascade layers).
  css: ["~/assets/css/main.css"],

  // Server-only secrets. `tmdbApiKey` is read by the Nitro TMDb client and is
  // never exposed to the client bundle. Override in prod with NUXT_TMDB_API_KEY.
  runtimeConfig: {
    tmdbApiKey: import.meta.env.TMDB_API_KEY ?? "",
  },

  app: {
    head: {
      htmlAttrs: { lang: "en" },
      title: "Movie Recommender",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "Pick the movies you love and get recommendations powered by collaborative filtering.",
        },
        { name: "color-scheme", content: "dark" },
      ],
      link: [
        { rel: "preconnect", href: "https://image.tmdb.org" },
        {
          rel: "preconnect",
          href: "https://fonts.googleapis.com",
        },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap",
        },
      ],
    },
  },
});
