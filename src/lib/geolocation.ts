/**
 * Wraps navigator.geolocation.getCurrentPosition in a Promise.
 * Returns null if geolocation is unavailable or the user denies permission.
 */
export async function getCoords(): Promise<GeolocationCoordinates | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      p => resolve(p.coords),
      () => resolve(null),
      { timeout: 5000, maximumAge: 5 * 60 * 1000 },
    )
  })
}
