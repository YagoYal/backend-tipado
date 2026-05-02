function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(/<[^>]*>/g, '').trim()
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeValue(v)]))
  }
  return value
}

export function sanitizeBody(body: unknown): unknown {
  return sanitizeValue(body)
}
