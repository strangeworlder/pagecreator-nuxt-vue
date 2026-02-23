<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "#imports";

const route = useRoute();
const isFinnish = computed(() => route.path.startsWith("/fi"));
</script>

<template>
  <nav>
    <ul v-if="isFinnish">
      <li>
        <a href="#gogam">Gogam</a> &mdash; "Online indie-pelit" -brändini. Asioita joita teen ja nykyään julkaisen ilmaiseksi, enimmäkseen itch.io:ssa.
      </li>
      <li>
        <a href="#kustannusosakeyhtiö-gogam">Kustannusosakeyhtiö Gogam</a> &mdash; Pääasiassa suomenkielinen kustantamo, joka vastaa myös indie-pelieni fyysisistä versioista.
      </li>
      <li>
        <a href="#gogam-entertainment">Gogam Entertainment</a> &mdash; Roolipeliviihteeseen keskittyvä yritys. Kauttaaltaan tuotan mm. pelautuksia (Actual Play).
      </li>
      <li>
        <a href="#muilta-julkaisijoilta">Muilta julkaisijoilta</a> &mdash; Muut julkaisijat joiden kanssa olen työskennellyt tai joille olen julkaissut pelejä.
      </li>
      <li>
        <a href="#artikkeleita-luettavaksi-ilmaiseksi">Artikkelit</a> &mdash; Ilmaiseksi kirjoittamani artikkelit, enimmäkseen blogissani.
      </li>
    </ul>
    <ul v-else>
      <li>
        <a href="#gogam">Gogam</a> &mdash; My "online indie games" brand. Stuff I make and these days publish for free, mostly on itch.io.
      </li>
      <li>
        <a href="#kustannusosakeyhtiö-gogam">Kustannusosakeyhtiö Gogam</a> &mdash; A mainly Finnish language publishing house that is also in charge of print versions of my indie games.
      </li>
      <li>
        <a href="#gogam-entertainment">Gogam Entertainment</a> &mdash; A TTRPG entertainment company. I create actual plays under this banner.
      </li>
      <li>
        <a href="#from-other-publishers">Other publishers</a> &mdash; Other publishers I have worked with or published games for.
      </li>
      <li>
        <a href="#articles-for-free-for-you-to-read">Articles</a> &mdash; Articles I have written for free, mostly on my blog.
      </li>
    </ul>
  </nav>
</template>
