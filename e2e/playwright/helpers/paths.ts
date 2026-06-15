import path from 'node:path'

export const e2eRoot = path.resolve(__dirname, '..')
export const adminStorageStatePath = path.join(e2eRoot, '.auth', 'admin.json')
