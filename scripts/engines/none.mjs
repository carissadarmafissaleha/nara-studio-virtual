/**
 * Engine: none.
 *
 * The office can be configured with no production engine at all (fresh install,
 * or while the boss is switching machines). Saying so out loud is better than
 * pretending an order was sent.
 */
export const name = 'none'

export async function ping() {
  return { ok: false, error: 'Belum ada mesin produksi yang dipasang.' }
}

export async function send() {
  throw new Error('Belum ada mesin produksi yang dipasang. Isi ~/.agent-office/engine.json dulu.')
}
