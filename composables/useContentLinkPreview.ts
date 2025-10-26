import { ref, computed } from 'vue'
import { queryContent, useRoute, useState, useRuntimeConfig } from '#imports'

export interface ContentPreview {
  title?: string
  description?: string
  summary?: string
  cover?: string
  image?: string
  datePublished?: string
  dateModified?: string
  tags?: string[]
  _path?: string
}

export function useContentLinkPreview() {
  const previewCache = ref<Map<string, ContentPreview | null>>(new Map())
  const loading = ref<Set<string>>(new Set())
  const enhancementsEnabled = useState<boolean>('content-enhance-ready', () => false)

  const getContentPreview = async (path: string): Promise<ContentPreview | null> => {
    const route = useRoute()
    const runtime = useRuntimeConfig()
    const defaultLocale = (runtime.public?.defaultLocale as string) || 'en'
    const currentLocale = (route.path.split('/')[1] || '').trim()

    const candidates: string[] = []
    const collapse = (p: string) => p.replace(/\/{2,}/g, '/').replace(/(.+)\/$/, '$1') || '/'
    const isLocalized = (p: string) => /^\/[a-z]{2}(?:\/|$)/i.test(p)

    if (path.startsWith('/')) {
      const abs = collapse(path)
      if (abs === '/') {
        // Map root to current or default locale index
        const localeRoot = `/${(currentLocale || defaultLocale)}`
        candidates.push(localeRoot)
        candidates.push('/')
      } else if (isLocalized(abs)) {
        candidates.push(abs)
      } else {
        // Absolute but missing locale -> try locale-prefixed first, then as-is
        const withLocale = `/${(currentLocale || defaultLocale)}${abs}`
        candidates.push(collapse(withLocale))
        candidates.push(abs)
      }
    } else {
      // Relative link -> try locale-relative and root-relative
      const withCurrent = currentLocale ? `/${currentLocale}/${path}` : `/${defaultLocale}/${path}`
      candidates.push(collapse(withCurrent))
      candidates.push(collapse(`/${path}`))
    }

    const unique = Array.from(new Set(candidates.map(p => p.replace(/\/{2,}/g, '/'))))

    for (const p of unique) {
      if (previewCache.value.has(p)) {
        const cached = previewCache.value.get(p) || null
        if (cached) return cached
      }
    }

    if (unique.some(p => loading.value.has(p))) {
      return null
    }

    try {
      unique.forEach(p => loading.value.add(p))
      for (const p of unique) {
        const content = await queryContent()
          .where({ _path: p })
          .only(['title', 'description', 'summary', 'cover', 'image', 'datePublished', 'dateModified', 'tags', '_path'])
          .findOne()
        if (content) {
          const preview: ContentPreview = {
            title: content.title,
            description: content.description,
            summary: content.summary,
            cover: content.cover,
            image: content.image,
            datePublished: content.datePublished,
            dateModified: content.dateModified,
            tags: content.tags,
            _path: content._path,
          }
          previewCache.value.set(content._path, preview)
          return preview
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch content preview for candidates: ${unique.join(', ')}` , error)
    } finally {
      unique.forEach(p => loading.value.delete(p))
    }

    unique.forEach(p => previewCache.value.set(p, null))
    return null
  }

  const isLocalLink = (href: string): boolean => {
    if (!href) return false
    return !/^(https?:)?\/\//.test(href) && !href.startsWith('#') && !href.startsWith('mailto:')
  }

  const getPreviewForLink = async (href: string): Promise<ContentPreview | null> => {
    if (!isLocalLink(href)) {
      return null
    }
    if (!enhancementsEnabled.value) {
      return null
    }
    return await getContentPreview(href)
  }

  return {
    getContentPreview,
    getPreviewForLink,
    isLocalLink,
    loading: computed(() => loading.value.size > 0),
  }
}


