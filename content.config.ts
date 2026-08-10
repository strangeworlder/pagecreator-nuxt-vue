import { defineCollection } from '@nuxt/content'
import { frontMatterSchema } from './server/utils/contentSchema'

export const collections = {
  content: defineCollection({
    type: 'page',
    source: '**/*.md',
    schema: frontMatterSchema
  })
}
