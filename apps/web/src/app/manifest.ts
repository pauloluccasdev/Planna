import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Planna",
    short_name: "Planna",
    description: "Planejamento adaptativo para estudantes universitários.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f2",
    theme_color: "#173c35",
    lang: "pt-BR",
    icons: [
      {
        src: "/planna-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
