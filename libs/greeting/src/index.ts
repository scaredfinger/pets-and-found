export function greeting(name = 'world'): string {
  return `Hello, ${name.trim() || 'world'}!`
}
