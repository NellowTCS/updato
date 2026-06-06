export default {
  logo: {
    alt: "Updato",
    href: "./"
  },
  favicon: "",
  theme: {
    name: "sky",
    defaultMode: "system",
    enableModeToggle: true,
    positionMode: "top",
    codeHighlight: true,
    customCss: []
  },
  plugins: {
    sitemap: {
      defaultChangefreq: "weekly",
      defaultPriority: 0.8
    }
  },
  search: true,
  minify: true,
  autoTitleFromH1: true,
  copyCode: true,
  pageNavigation: true,
  navigation: [
    {
      title: "Home",
      path: "/",
      icon: "home"
    },
    {
      title: "Getting Started",
      children: [
        { title: "Quick Start", path: "/getting-started/quickstart" },
        { title: "Core Concepts", path: "/getting-started/concepts" },
      ],
    },
    {
      title: "Guide",
      children: [
        { title: "Client Library", path: "/guide/client-library" },
        { title: "GitHub Action", path: "/guide/github-action" },
        { title: "Worker", path: "/guide/worker" },
        { title: "Hot-Swap", path: "/guide/hot-swap" },
        { title: "Manifest", path: "/guide/manifest" },
        { title: "Download Metrics", path: "/guide/metrics" },
      ],
    },
    {
      title: "GitHub",
      path: "https://github.com/NellowTCS/updato",
      icon: "github",
      external: true
    }
  ],
  footer: "Built with docmd.",
  title: "Updato",
  url: "https://nellowtcs.me/updato/docs",
  src: "docs",
  out: "site"
};
