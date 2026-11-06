import type { MetadataRoute } from "next";

/** Web app manifest: lets the phone install Belle on the home screen with its own icon and colours. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Belle · Conseillère beauté",
    short_name: "Belle",
    description: "Trouvez le maquillage qui vous va vraiment, au meilleur prix.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5e7b2",
    theme_color: "#973131",
    categories: ["beauty", "shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Scanner un produit", short_name: "Scanner", url: "/scanner", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Demander à Belle", short_name: "Conseils", url: "/conseillere", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
