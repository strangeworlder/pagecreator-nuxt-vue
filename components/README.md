## Components: Atoms and Molecules (Vue/Nuxt)

### Purpose
Establish a small, reusable UI system with clear layering:
- Atoms: presentational primitives (no fetching, no global state)
- Molecules: small compositions of atoms (light glue logic only)

Nuxt auto‑registers components from `components/`, so files in this folder are immediately usable in templates.

### Directory Layout
```
components/
  atoms/        # Base* presentational primitives
  molecules/    # Compositions of atoms with simple behavior
```

### Naming
- Atoms: prefix with `Base` (e.g., `BaseButton.vue`, `BaseInput.vue`, `BaseIcon.vue`).
- Molecules: task‑oriented names (e.g., `FormField.vue`, `SearchInput.vue`).

### Conventions
- Props/Emits
  - Atoms expose minimal props and emit DOM‑like events (e.g., `click`, `update:modelValue`).
  - Molecules aggregate behavior; pass through essential props to inner atoms where useful.
- Styling
  - Atoms rely on design tokens/utility classes; avoid app‑specific CSS.
  - Molecules can arrange atoms but keep styles light and generic.
- Accessibility
  - Atoms render semantic elements (`button`, `input`, `label`).
  - Molecules connect `label` ↔ `input` via `for`/`id`, set `aria-describedby` for help/error.
- Testing
  - Atoms: unit tests for props/emits/states.
  - Molecules: integration tests for wiring/behavior.

### Example Atom: `atoms/BaseButton.vue`
```vue
<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{ variant?: Variant; size?: Size; disabled?: boolean; type?: 'button' | 'submit' | 'reset' }>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  type: 'button'
})

const emit = defineEmits<{ (e: 'click', event: MouseEvent): void }>()

const classes = computed(() => [
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  props.size === 'sm' ? 'h-8 px-3 text-sm' : props.size === 'lg' ? 'h-11 px-6 text-base' : 'h-9 px-4 text-sm',
  props.variant === 'primary' && !props.disabled ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600' : '',
  props.variant === 'secondary' && !props.disabled ? 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400' : '',
  props.variant === 'ghost' ? 'bg-transparent text-gray-900 hover:bg-gray-100 focus:ring-gray-400' : '',
  props.variant === 'danger' && !props.disabled ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600' : '',
  props.disabled ? 'opacity-50 cursor-not-allowed' : ''
].filter(Boolean).join(' '))
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled" @click="(e) => emit('click', e)">
    <slot />
  </button>
</template>
```

### Example Molecule: `molecules/FormField.vue`
```vue
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ id: string; label: string; helpText?: string; error?: string; required?: boolean }>(), {
  helpText: undefined,
  error: undefined,
  required: false
})

const describedBy = computed(() => {
  const ids: string[] = []
  if (props.helpText) ids.push(`${props.id}-help`)
  if (props.error) ids.push(`${props.id}-error`)
  return ids.join(' ') || undefined
})
</script>

<template>
  <div class="w-full">
    <label :for="id" class="mb-1 block text-sm font-medium text-gray-700">
      {{ label }}<span v-if="required" aria-hidden="true" class="text-red-600"> *</span>
    </label>

    <slot name="control" :id="id" :ariaDescribedBy="describedBy" />

    <p v-if="helpText" :id="`${id}-help`" class="mt-1 text-xs text-gray-500">
      {{ helpText }}
    </p>
    <p v-if="error" :id="`${id}-error`" class="mt-1 text-xs text-red-600">
      {{ error }}
    </p>
  </div>
</template>
```

### Usage Example
```vue
<FormField id="email" label="Email" :error="errors.email">
  <template #control="{ id, ariaDescribedBy }">
    <BaseInput v-model="form.email" :id="id" type="email" :aria-describedby="ariaDescribedBy" />
  </template>
</FormField>
```

### Scaffolding
```bash
mkdir -p components/atoms components/molecules
```

Add the example files and import them directly in pages or other molecules; Nuxt will auto‑register them.

### Migration Checklist
- Move presentational components into `components/atoms/` and rename them `Base*`.
- Extract recurring label+input+error patterns into `components/molecules/FormField.vue`.
- Keep data fetching/global state outside components; pass as props.
- Add tests: atoms (props/emits), molecules (behavior).


