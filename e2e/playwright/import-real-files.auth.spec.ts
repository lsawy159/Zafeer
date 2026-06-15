import { expect, test, type Page } from '@playwright/test'

import {
  COMPANY_COLUMNS_ORDER,
  EMPLOYEE_COLUMNS_ORDER,
} from '../../artifacts/zafeer/src/components/import-export/ImportTab/importTypes'
import { restDelete, restInsert, restSelectSingle } from './support/selfCleaningSupabase'
import { createTemporaryWorkbook, removeTemporaryWorkbook } from './support/tempExcelWorkbook'

function buildRow(headers: string[], values: Array<string | number>) {
  return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
}

async function openImportPanel(page: Page) {
  await page.goto('/import-export')
  await expect(page).toHaveURL(/\/import-export$/)
  await page.locator('main button:has(p)').nth(1).click()
  await expect(page.locator('#file-upload')).toHaveCount(1)
}

async function selectImportEntity(page: Page, index: number) {
  const entityButtons = page.locator('.app-panel .mb-4 .grid button')
  await entityButtons.nth(index).click()
  await expect(page.locator('#file-upload')).toHaveCount(1)
}

async function runImportFlow(page: Page, filePath: string) {
  await page.locator('#file-upload').setInputFiles(filePath)

  const selectedFilePanel = page.locator('.app-info-block').last()
  await expect(selectedFilePanel).toBeVisible()
  await selectedFilePanel.locator('button').first().click()

  const previewModal = page.locator('.app-modal-surface').last()
  await expect(previewModal).toBeVisible({ timeout: 20_000 })
  await previewModal.locator('button').last().click()
}

test.describe('self-cleaning real Excel import coverage', () => {
  test.setTimeout(90_000)

  test('import employee from a real Excel file and remove imported records afterward', async ({
    page,
    request,
  }) => {
    const unique = Date.now()
    const tempCompanyName = `PW Import Company ${unique}`
    const tempEmployeeName = `PW Imported Employee ${unique}`
    const tempUnifiedNumber = Number(`7${String(unique).slice(-9)}`)
    const tempResidenceNumber = Number(`9${String(unique).slice(-9)}`)

    let companyId: string | null = null
    let employeeId: string | null = null
    let workbookPath: string | null = null

    try {
      const company = await restInsert(request, page, 'companies', {
        name: tempCompanyName,
        unified_number: tempUnifiedNumber,
        labor_subscription_number: '',
        social_insurance_number: '',
        max_employees: 5,
      })
      companyId = company.id

      workbookPath = await createTemporaryWorkbook({
        prefix: 'employee-import',
        sheetName: 'Sheet1',
        headers: EMPLOYEE_COLUMNS_ORDER,
        rows: [
          buildRow(EMPLOYEE_COLUMNS_ORDER, [
            tempEmployeeName,
            'Technician',
            'Egyptian',
            tempResidenceNumber,
            '',
            '',
            '',
            '',
            3200,
            'بدون أجير',
            '',
            tempCompanyName,
            tempUnifiedNumber,
            '',
            '',
            '',
            '',
            '',
            '',
            'Playwright temporary import row',
          ]),
        ],
      })

      await openImportPanel(page)
      await selectImportEntity(page, 0)
      await runImportFlow(page, workbookPath)

      await expect
        .poll(
          async () => {
            const imported = await restSelectSingle<{ id: string; company_id: string }>(
              request,
              page,
              'employees',
              { residence_number: tempResidenceNumber },
              'id,company_id'
            )

            employeeId = imported?.id ?? null
            return imported?.company_id ?? ''
          },
          { timeout: 30_000 }
        )
        .toBe(companyId)
    } finally {
      if (employeeId) {
        await restDelete(request, page, 'employees', { id: employeeId })
      } else {
        await restDelete(request, page, 'employees', { residence_number: tempResidenceNumber })
      }
      if (companyId) {
        await restDelete(request, page, 'companies', { id: companyId })
      } else {
        await restDelete(request, page, 'companies', { unified_number: tempUnifiedNumber })
      }
      await removeTemporaryWorkbook(workbookPath)
    }
  })

  test('import company from a real Excel file and remove imported record afterward', async ({
    page,
    request,
  }) => {
    const unique = Date.now()
    const tempCompanyName = `PW Excel Company ${unique}`
    const tempUnifiedNumber = Number(`7${String(unique).slice(-9)}`)

    let companyId: string | null = null
    let workbookPath: string | null = null

    try {
      workbookPath = await createTemporaryWorkbook({
        prefix: 'company-import',
        sheetName: 'Sheet1',
        headers: COMPANY_COLUMNS_ORDER,
        rows: [
          buildRow(COMPANY_COLUMNS_ORDER, [
            tempCompanyName,
            tempUnifiedNumber,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            'Playwright temporary company import row',
          ]),
        ],
      })

      await openImportPanel(page)
      await selectImportEntity(page, 1)
      await runImportFlow(page, workbookPath)

      await expect
        .poll(
          async () => {
            const imported = await restSelectSingle<{ id: string; name: string }>(
              request,
              page,
              'companies',
              { unified_number: tempUnifiedNumber },
              'id,name'
            )

            companyId = imported?.id ?? null
            return imported?.name ?? ''
          },
          { timeout: 30_000 }
        )
        .toBe(tempCompanyName)
    } finally {
      if (companyId) {
        await restDelete(request, page, 'companies', { id: companyId })
      } else {
        await restDelete(request, page, 'companies', { unified_number: tempUnifiedNumber })
      }
      await removeTemporaryWorkbook(workbookPath)
    }
  })
})
