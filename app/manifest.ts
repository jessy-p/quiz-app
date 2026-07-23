import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Study Loop",
    short_name: "Study Loop",
    description: "A phone-first MCQ study app for focused, distraction-free studying.",
    start_url: "/",
    display: "standalone",
    background_color: "#17140f",
    theme_color: "#17140f",
    icons: [
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
