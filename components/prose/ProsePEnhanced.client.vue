<script lang="ts">
import { Comment, Text, type VNode, defineComponent, h } from "vue";

export default defineComponent({
  name: "ProsePEnhanced",
  setup(_, { slots, attrs }) {
    return () => {
      const nodes = (slots.default?.() || []) as VNode[];

      const filtered = nodes.filter((n) => {
        if (!n) return false;
        if (n.type === Comment) return false;
        if (n.type === Text) {
          const s = typeof n.children === "string" ? n.children.trim() : "";
          return s.length > 0;
        }
        return true;
      });

      let isOnlyImage = false;
      if (filtered.length === 1) {
        const n = filtered[0];
        const t = n?.type;
        if (t) {
          if (typeof t === "string") {
            if (t === "img" || t === "picture") isOnlyImage = true;
          } else {
            const componentType = t as { name?: string; __name?: string };
            const name = componentType.name || componentType.__name || "";
            if (name === "ProseImgWrapper" || String(name).includes("ProseImg")) {
              isOnlyImage = true;
            }
          }
        }
      }

      const result = slots.default?.();

      if (isOnlyImage) {
        return result;
      }

      return h("p", attrs, result);
    };
  },
});
</script>


