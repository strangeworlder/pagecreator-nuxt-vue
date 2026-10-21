export interface NavigationItem {
  href: string;
  targetId: string;
  label: string;
  description: string;
}

export const NAVIGATION_ITEMS: Record<"fi" | "en", NavigationItem[]> = {
  fi: [
    {
      href: "#kustannusosakeyhtiö-gogam",
      targetId: "header-kustannusosakeyhtiö-gogam",
      label: "Kustannusosakeyhtiö Gogam",
      description:
        "Pääasiassa suomenkielinen kustantamo, joka vastaa myös indie-pelieni fyysisistä versioista.",
    },
    {
      href: "#gogam",
      targetId: "header-gogam",
      label: "Gogam",
      description:
        '"Online indie-pelit" -brändini. Asioita joita teen ja nykyään julkaisen ilmaiseksi, enimmäkseen itch.io:ssa.',
    },
    {
      href: "#gogam-entertainment",
      targetId: "header-gogam-entertainment",
      label: "Gogam Entertainment",
      description:
        "Roolipeliviihteeseen keskittyvä yritys. Kauttaaltaan tuotan mm. pelautuksia (Actual Play).",
    },
    {
      href: "#muilta-julkaisijoilta",
      targetId: "header-muilta-julkaisijoilta",
      label: "Muilta julkaisijoilta",
      description:
        "Muut julkaisijat joiden kanssa olen työskennellyt tai joille olen julkaissut pelejä.",
    },
    {
      href: "#artikkeleita-luettavaksi-ilmaiseksi",
      targetId: "header-artikkeleita-luettavaksi-ilmaiseksi",
      label: "Artikkelit",
      description: "Ilmaiseksi kirjoittamani artikkelit, enimmäkseen blogissani.",
    },
  ],
  en: [
    {
      href: "#gogam",
      targetId: "header-gogam",
      label: "Gogam",
      description:
        'My "online indie games" brand. Stuff I make and these days publish for free, mostly on itch.io.',
    },
    {
      href: "#kustannusosakeyhtiö-gogam",
      targetId: "header-kustannusosakeyhtiö-gogam",
      label: "Kustannusosakeyhtiö Gogam",
      description:
        "A mainly Finnish language publishing house that is also in charge of print versions of my indie games.",
    },
    {
      href: "#gogam-entertainment",
      targetId: "header-gogam-entertainment",
      label: "Gogam Entertainment",
      description: "A TTRPG entertainment company. I create actual plays under this banner.",
    },
    {
      href: "#from-other-publishers",
      targetId: "header-from-other-publishers",
      label: "Other publishers",
      description: "Other publishers I have worked with or published games for.",
    },
    {
      href: "#articles-for-free-for-you-to-read",
      targetId: "header-articles-for-free-for-you-to-read",
      label: "Articles",
      description: "Articles I have written for free, mostly on my blog.",
    },
  ],
};
