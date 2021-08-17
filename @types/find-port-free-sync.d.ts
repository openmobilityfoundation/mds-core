declare module 'find-port-free-sync' {
  type findPortOptions = { start?: number = 1, end?: number = 65534, num?: number = 1, ip?: string = '127.0.0.1', port?: number | null = null }

  function findPortFreeSync(options: findPortOptions): number

  export default findPortFreeSync
}