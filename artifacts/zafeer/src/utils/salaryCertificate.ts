// مولّد شهادة تعريف بالراتب (PDF) — مطابق لنموذج شركة مهدي محيميد النفيعي
// الهيدر والختم صور مستخرجة من النموذج الأصلي؛ الإطار والشريط السفلي CSS.

// ثوابت الشركة (النموذج لشركة واحدة)
export const CERT_COMPANY_NAME = 'شركة مهدي محيميد النفيعي'
export const CERT_DEFAULT_MANAGER = 'سعود بن محيميد بن براك النفيعي'
export const CERT_DEFAULT_MANAGER_TITLE = 'المدير العام'
// رقم السجل التجاري الافتراضي (يُستبدل برقم سجل المؤسسة المربوط بالموظف)
export const CERT_DEFAULT_CR = '7052601163'

export interface CertificateData {
  employeeName: string
  residenceNumber: string
  crNumber: string
  salary: number
  managerName: string
  managerTitle: string
  /** تاريخ الإصدار بصيغة dd/MM/yyyy */
  dateStr: string
}

export interface CertAssets {
  headerDataUrl: string
  stampDataUrl: string
  signatureDataUrl: string
}

let assetsCache: CertAssets | null = null

async function fetchAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`تعذّر تحميل أصل الشهادة: ${url}`)
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)))
  }
  return `data:image/png;base64,${btoa(binary)}`
}

/** يحمّل صور الهيدر والختم ويحوّلها base64 (مع تخزين مؤقت). */
export async function loadCertAssets(): Promise<CertAssets> {
  if (assetsCache) return assetsCache
  const [headerDataUrl, stampDataUrl, signatureDataUrl] = await Promise.all([
    fetchAsBase64('/cert/header.png'),
    fetchAsBase64('/cert/stamp.png'),
    fetchAsBase64('/cert/signature.png'),
  ])
  assetsCache = { headerDataUrl, stampDataUrl, signatureDataUrl }
  return assetsCache
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatSalary(value: number): string {
  return Number(value || 0).toLocaleString('en-US')
}

/** يبني HTML الشهادة كاملاً (A4، RTL) جاهز للـ html2canvas. */
export function buildCertificateHtml(data: CertificateData, assets: CertAssets): string {
  const salaryText = `${formatSalary(data.salary)} ريال`

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>شهادة تعريف بالراتب</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    font-family:'Segoe UI','Tahoma','Arial Unicode MS','Arial',sans-serif;
    background:#fff;color:#1a2238;direction:rtl;width:900px;
  }
  .page{
    position:relative;width:900px;height:1273px;background:#fff;
    border:13px solid #16233f;border-radius:6px;
    padding:0 0 70px 0;overflow:hidden;
    display:flex;flex-direction:column;
  }
  /* خط ذهبي داخلي يحاذي الإطار */
  .page::before{
    content:'';position:absolute;inset:5px;border:1.5px solid #c8a24b;
    border-radius:4px;pointer-events:none;z-index:1;
  }
  .header-img{display:block;width:100%;}
  .body{padding:14px 54px 0 54px;position:relative;z-index:2;flex:1;display:flex;flex-direction:column}
  .date{text-align:right;font-size:15px;font-weight:600;margin-top:6px}
  .title{text-align:center;font-size:26px;font-weight:800;margin:26px 0 30px}
  .greeting{font-size:16px;font-weight:700;margin-bottom:26px}
  .para{font-size:16px;line-height:2.1;margin-bottom:24px;text-align:justify}
  .para .v{font-weight:700}
  .lead{font-size:16px;margin:14px 0 14px}
  table.salary{width:100%;border-collapse:collapse;margin:6px 0 30px;font-size:16px}
  table.salary th,table.salary td{border:1px solid #1a2238;padding:11px 16px;text-align:center}
  table.salary th{font-weight:700;background:#fff}
  .disclaimer{font-size:15.5px;line-height:2.1;text-align:justify;margin-top:18px}
  /* الفوتر يُدفع لأسفل الصفحة؛ كل العناصر متوسّطة أفقياً */
  .sign-block{margin-top:auto;margin-bottom:42px;display:flex;flex-direction:column;align-items:center;position:relative;z-index:2}
  .company-line{font-size:18px;font-weight:800}
  .manager{font-size:16px;font-weight:700;margin-top:4px}
  .manager-title{font-size:15px;font-weight:600;color:#1a2238}
  .signature{display:block;width:150px;height:auto;margin-top:14px}
  .stamp{position:relative;width:340px;height:185px;margin-top:6px}
  .stamp img{display:block;width:340px;height:185px}
  /* الشريط السفلي الكحلي */
  .bottom-band{
    position:absolute;left:13px;right:13px;bottom:13px;height:30px;
    background:#16233f;border-radius:0 0 3px 3px;z-index:2;
  }
</style>
</head>
<body>
  <div class="page">
    <img class="header-img" src="${assets.headerDataUrl}" alt="header"/>
    <div class="body">
      <div class="date">التاريخ: ${escapeHtml(data.dateStr)}</div>
      <div class="title">شهادة تعريف بالراتب</div>
      <div class="greeting">إلى من يهمه الأمر،</div>
      <p class="para">
        تشهد ${escapeHtml(CERT_COMPANY_NAME)}، سجل تجاري رقم: <span class="v">${escapeHtml(data.crNumber)}</span>،
        بأن الموظف/ <span class="v">${escapeHtml(data.employeeName)}</span>،
        رقم الإقامة: <span class="v">${escapeHtml(data.residenceNumber)}</span>،
        يعمل لدينا ولا يزال على رأس العمل.
      </p>
      <div class="lead">وفيما يلي تفصيل الراتب الشهري الشامل كافة البدلات</div>
      <table class="salary">
        <thead><tr><th>الوصف</th><th>المبلغ</th></tr></thead>
        <tbody><tr><td>إجمالي الراتب الشهري الشامل</td><td>${escapeHtml(salaryText)}</td></tr></tbody>
      </table>
      <p class="disclaimer">
        وقد تم إصدار هذه الشهادة بناءً على طلب الموظف لتقديمها للجهات المعنية،
        دون أدنى مسؤولية مالية أو قانونية على الشركة تجاه حقوق الغير.
      </p>
      <div class="sign-block">
        <div class="company-line">${escapeHtml(CERT_COMPANY_NAME)}</div>
        <div class="manager">${escapeHtml(data.managerName)}</div>
        <div class="manager-title">${escapeHtml(data.managerTitle)}</div>
        <img class="signature" src="${assets.signatureDataUrl}" alt="signature"/>
        <div class="stamp">
          <img src="${assets.stampDataUrl}" alt="stamp"/>
        </div>
      </div>
    </div>
    <div class="bottom-band"></div>
  </div>
</body>
</html>`
}

/** يلتقط الشهادة كـ canvas عبر html2canvas (نفس نمط القسيمة). */
export async function captureCertificate(html: string): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import('html2canvas')
  const iframe = document.createElement('iframe')
  iframe.style.cssText =
    'position:fixed;visibility:hidden;width:980px;height:1400px;z-index:-9999;top:0;left:0;pointer-events:none;border:none;'
  document.body.appendChild(iframe)

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) throw new Error('iframe contentDocument unavailable')

    iframeDoc.open()
    iframeDoc.write(html)
    iframeDoc.close()

    await iframeDoc.fonts.ready
    await new Promise((resolve) => setTimeout(resolve, 80))

    const page = iframeDoc.querySelector<HTMLElement>('.page') ?? iframeDoc.body
    return await html2canvas(page, {
      scale: 2,
      foreignObjectRendering: true,
      windowWidth: 900,
      backgroundColor: '#ffffff',
      logging: false,
    })
  } finally {
    document.body.removeChild(iframe)
  }
}

/**
 * يرسم رقم السجل التجاري داخل صورة الختم نفسها (raster) عند موضع الأرقام الأصلية،
 * على سطر "س.ت" ومحاذى لليمين قبلها. أدق وأثبت من overlay عبر CSS لأنه يصبح جزءاً
 * من الصورة ولا يتأثر بفروقات الخطوط أو html2canvas.
 * إحداثيات أصلية (677×369): الأرقام كانت x236..395، "س.ت" يبدأ ~399، مركز السطر ~186.
 */
function composeStampWithNumber(stampDataUrl: string, crNumber: string): Promise<string> {
  // الختم البيضاوي الجديد (677×369): "س.ت" متوسّطة عند x≈340 y≈200. نكتب الرقم الموحّد
  // تحتها مباشرةً، متوسّطاً أفقياً عند x=340 وقاعه عند y=252، محصوراً داخل البيضاوي
  // (الداخل عند هذا الصف ≈ x153..528). مستقل عن خط المتصفح وعن metrics: نقيس بكسلات
  // الحبر الفعلية (getImageData) ثم نقصّ ونحجّم الرقم ليملأ صندوقاً ثابتاً فلا يخرج عن البيضاوي.
  const CENTER_X = 340
  const BOTTOM_Y = 252
  const MAX_W = 280
  const MAX_H = 26

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || 677
      canvas.height = img.naturalHeight || 369
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(stampDataUrl)
        return
      }
      ctx.drawImage(img, 0, 0)

      const cr = String(crNumber)
      const base = 72
      const pad = 8
      const tmp = document.createElement('canvas')
      tmp.width = Math.ceil(cr.length * base * 0.7) + pad * 2
      tmp.height = Math.ceil(base * 1.6)
      const tctx = tmp.getContext('2d')
      if (!tctx) {
        resolve(canvas.toDataURL('image/png'))
        return
      }
      tctx.font = `700 ${base}px Tahoma, Arial, sans-serif`
      tctx.fillStyle = '#16233f'
      tctx.textBaseline = 'alphabetic'
      tctx.textAlign = 'left'
      tctx.fillText(cr, pad, base)

      // قياس صندوق الحبر الفعلي بالبكسل (مستقل عن أي metrics)
      const px = tctx.getImageData(0, 0, tmp.width, tmp.height).data
      let minX = tmp.width
      let minY = tmp.height
      let maxX = -1
      let maxY = -1
      for (let y = 0; y < tmp.height; y++) {
        for (let x = 0; x < tmp.width; x++) {
          if (px[(y * tmp.width + x) * 4 + 3] > 16) {
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
          }
        }
      }

      if (maxX < 0) {
        resolve(canvas.toDataURL('image/png'))
        return
      }

      const inkW = maxX - minX + 1
      const inkH = maxY - minY + 1
      const scale = Math.min(MAX_W / inkW, MAX_H / inkH)
      const drawW = inkW * scale
      const drawH = inkH * scale
      // قاع الحبر عند BOTTOM_Y، متوسّط أفقياً حول CENTER_X
      ctx.drawImage(tmp, minX, minY, inkW, inkH, CENTER_X - drawW / 2, BOTTOM_Y - drawH, drawW, drawH)

      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = stampDataUrl
  })
}

/** يولّد ويُنزّل الشهادة PDF. */
export async function downloadCertificatePdf(data: CertificateData): Promise<void> {
  const [{ jsPDF }, baseAssets] = await Promise.all([import('jspdf'), loadCertAssets()])
  const stampDataUrl = await composeStampWithNumber(baseAssets.stampDataUrl, data.crNumber)
  const assets: CertAssets = { ...baseAssets, stampDataUrl }
  const canvas = await captureCertificate(buildCertificateHtml(data, assets))
  const imageData = canvas.toDataURL('image/png')

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgW = pageWidth
  const imgH = (canvas.height * imgW) / canvas.width

  pdf.addImage(imageData, 'PNG', 0, 0, imgW, imgH)

  // الشهادة صفحة A4 واحدة ثابتة؛ نتجاهل أي تجاوز ضئيل (< 2mm) ناتج عن التقريب
  let remaining = imgH - pageHeight
  let yOffset = 0
  while (remaining > 2) {
    yOffset -= pageHeight
    pdf.addPage()
    pdf.addImage(imageData, 'PNG', 0, yOffset, imgW, imgH)
    remaining -= pageHeight
  }

  const safeName = data.employeeName.replace(/[\\/:*?"<>|]/g, '').trim() || 'تعريف-راتب'
  pdf.save(`تعريف راتب - ${safeName}.pdf`)
}
