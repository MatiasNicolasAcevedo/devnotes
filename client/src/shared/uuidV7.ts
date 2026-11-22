export function newUuidV7(): string {
  const timestamp = Date.now().toString(16).padStart(12, '0')
  const random = crypto.randomUUID()
  return `${timestamp.slice(0, 8)}-${timestamp.slice(8)}-7${random.slice(15)}`
}
