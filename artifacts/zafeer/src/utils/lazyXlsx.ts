// SECURITY NOTE (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9):
// xlsx has ReDoS vulnerabilities in user-input parsing. No patched version on npm.
// TODO: migrate to exceljs (different API — ~40 call sites). Tracked as separate refactor.
// Risk mitigated: import files should be validated server-side before processing.
let xlsxModulePromise: Promise<typeof import('xlsx')> | null = null

export const loadXlsx = async (): Promise<typeof import('xlsx')> => {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx')
  }

  return xlsxModulePromise
}
