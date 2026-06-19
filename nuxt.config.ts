// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  // Global, framework-free stylesheet (tokens + base + cascade layers).
  css: ["~/assets/css/main.css"],

  // Deploy target: Cloudflare Workers (module syntax) via wrangler.
  // nodeCompat enables the `nodejs_compat` runtime the Nitro server bundle needs.
  // TMDb assets are pre-baked at build time, so no runtime secrets are required.
  nitro: {
    preset: "cloudflare_module",
    cloudflare: {
      nodeCompat: true,
    },
    // Nuxt's SSR runtime has a stray `import.meta.url.replace(...)` statement
    // (its result is discarded). On Cloudflare workerd `import.meta.url` is
    // undefined inside that chunk, so the call throws during SSR. Neutralise the
    // exact expression at build time. Targeted so the entry module's own valid
    // `import.meta.url` use is untouched.
    replace: {
      'import.meta.url.replace(/\\/app\\/.*$/, "/")': '"/"',
    },
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
