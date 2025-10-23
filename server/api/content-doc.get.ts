// @ts-nocheck
import { getQuery, setHeader } from 'h3'
import { serverQueryContent } from '#content/server'

export default defineEventHandler(async (event) => {
  const { path } = getQuery(event)
  if (!path || typeof path !== 'string') {
    setHeader(event, 'Cache-Control', 'no-store')
    return { error: 'Missing path' }
  }
  const doc = await serverQueryContent(event).where({ _path: path }).findOne()
  setHeader(event, 'Cache-Control', 'no-store')
  return { doc }
})


