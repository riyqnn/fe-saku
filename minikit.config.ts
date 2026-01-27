const ROOT_URL = process.env.NEXT_PUBLIC_URL || "https://sakku.netlify.app/"

export const minikitConfig = {
  accountAssociation: {
    header: "",
    payload: "",
    signature: ""
  },
  miniapp: {
    version: "1",
    name: "Saku",
    subtitle: "Crypto payments made simple.",
    description:
      "Send and receive crypto using just a phone number. No wallet addresses or complicated setup.",
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    iconUrl: `${ROOT_URL}/logo.png`,
    splashImageUrl: `${ROOT_URL}/logo.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "finance",
    tags: ["payments", "crypto", "wallet", "social"],
    heroImageUrl: `${ROOT_URL}/logo.png`,
    tagline: "Send crypto with just a phone number",
    ogTitle: "Saku — Crypto payments made simple",
    ogDescription:
      "Send and receive crypto using just a phone number. No wallet addresses. No hassle.",
    ogImageUrl: `${ROOT_URL}/logo.png`,
  },
} as const;