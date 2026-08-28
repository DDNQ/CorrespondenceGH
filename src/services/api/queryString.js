export function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams()

  Object.keys(params)
    .sort()
    .forEach((key) => {
      const value = params[key]

      if (value === null || value === undefined) {
        return
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item !== null && item !== undefined) {
            searchParams.append(key, String(item))
          }
        })
        return
      }

      searchParams.append(key, String(value))
    })

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}
