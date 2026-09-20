#!/usr/bin/env node
/**
 * Audit-Status Portal/Website (baerenwald).
 * Usage: node scripts/audit-status.mjs [--json] [--write-todo]
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')
const args = new Set(process.argv.slice(2))

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

function readSafe(p) {
  try {
    return readFileSync(p, 'utf8')
  } catch {
    return ''
  }
}

const filesTs = walk(SRC).filter((p) => /\.(ts|tsx)$/.test(p))
const texts = new Map(filesTs.map((p) => [p, readSafe(p)]))

function countInSrc(re) {
  let n = 0
  for (const t of texts.values()) {
    const m = t.match(re)
    if (m) n += m.length
  }
  return n
}

function filesMatching(re) {
  let n = 0
  for (const t of texts.values()) {
    if (re.test(t)) n++
  }
  return n
}

function fileExists(rel) {
  return existsSync(join(ROOT, rel))
}

function filesOverLines(limit) {
  let n = 0
  for (const t of texts.values()) {
    if (t.split('\n').length > limit) n++
  }
  return n
}

function hasEslint() {
  return (
    fileExists('eslint.config.mjs') ||
    fileExists('eslint.config.js') ||
    fileExists('.eslintrc.json') ||
    fileExists('.eslintrc.js')
  )
}

function hasCi() {
  const d = join(ROOT, '.github/workflows')
  if (!existsSync(d)) return false
  return readdirSync(d).some((f) => /\.ya?ml$/.test(f))
}

function pkgHas(name) {
  return readSafe(join(ROOT, 'package.json')).includes(`"${name}"`)
}

/** P6-2: --p2-green-dark / --p2-green-50 dürfen kein eigenes Hex haben (nur var()). */
function hasP2GreenHexDupes() {
  const css = [
    readSafe(join(ROOT, 'src/app/globals.css')),
    readSafe(join(ROOT, 'src/app/baerenwald-landing.css')),
    readSafe(join(ROOT, 'src/app/funnel-ui.css')),
  ].join('\n')
  const re = /--p2-green-(?:dark|50)\s*:\s*[^;]*#[0-9a-fA-F]{3,8}/g
  return re.test(css)
}

/** P6-2: kanonische Primaries je App mit Hex definiert. */
function hasCanonicalPrimaries() {
  const globals = readSafe(join(ROOT, 'src/app/globals.css'))
  const landing = readSafe(join(ROOT, 'src/app/baerenwald-landing.css'))
  const funnel = readSafe(join(ROOT, 'src/app/funnel-ui.css'))
  const websiteCss = `${globals}\n${landing}\n${funnel}`
  const hasFl =
    /--fl-accent\s*:\s*#[0-9a-fA-F]{3,8}/.test(websiteCss)
  const hasP2 =
    /--p2-primary\s*:\s*#[0-9a-fA-F]{3,8}/.test(globals)
  return hasFl && hasP2
}

/** Fremde Token-Prefixe in Portal-Flächen */
function foreignTokens() {
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    const isPortal =
      /components\/(portal|partner|org|shared)\//.test(rel) ||
      /app\/(portal|partner|org)\//.test(rel)
    const isWeb = /components\/(home|funnel|marketing|website)\//.test(rel) || /app\/\(marketing\)/.test(rel)
    if (isPortal && /--fl-/.test(t)) n += (t.match(/--fl-/g) || []).length
    if (isWeb && /--p2-/.test(t)) n += (t.match(/--p2-/g) || []).length
  }
  return n
}

/** portal-btn auf <button>, PortalButton.tsx ausgenommen (kanonische Implementierung). */
function portalBtnOnButtonOutsideCanonical() {
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (/PortalButton\.tsx$/.test(rel)) continue
    const m = t.match(/<button\b[^>]*portal-btn/g)
    if (m) n += m.length
  }
  return n
}

/** COPY-REGELN: freie „Keine …“-Leertexte in Portal-UI (wie CRM). */
function countFreieLeertexte() {
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (/PortalEmptyState\.tsx$|PortalStateView\.tsx$|PortalEmptyState\.tsx$/.test(rel)) continue
    if (/\/portal-copy\//.test(rel) || /\/lib\//.test(rel)) continue
    if (/\/actions\//.test(rel) || /\/api\//.test(rel)) continue
    if (!/components\/(portal|partner|org|shared|melden)\//.test(rel)) continue
    const lines = t.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const s = lines[i].trim()
      if (!s || s.startsWith('//') || s.startsWith('*')) continue
      if (/portalToast|toast\./.test(s)) continue
      if (!/Keine\s/.test(s)) continue
      if (
        /(?:title|hint|emptyTitle|emptyDescription|emptyLabel|emptyHint|emptyText|empty|label|description|children|aria-label)\s*=/.test(
          s
        )
      ) {
        continue
      }
      const win = lines.slice(Math.max(0, i - 24), i + 1).join('\n')
      if (/<PortalInboxEmpty\b|<PortalEmptyState\b|<PortalStateView\b/.test(win)) continue
      if (/\bEMPTY\./.test(s)) continue
      if (
        />Keine\s[^<{]{0,80}</.test(s) ||
        /\{['"`]Keine\s[^'"`]{0,80}['"`]\}/.test(s) ||
        /\?\s*['"`]Keine\s[^'"`]{0,80}['"`]/.test(s) ||
        /:\s*['"`]Keine\s[^'"`]{0,80}['"`]/.test(s) ||
        /return\s+['"`]Keine\s/.test(s) ||
        /\|\|\s*['"`]Keine\s/.test(s) ||
        /\?\?\s*['"`]Keine\s/.test(s)
      ) {
        n++
      }
    }
  }
  return n
}

/** Toast-Stringliterale ohne TOAST./COPY_/userMessage. */
function countToastOhneCopy() {
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (/\/portal-copy\//.test(rel) || /portal-toast\.ts$/.test(rel)) continue
    const lit =
      /portalToast(?:Success|Error|Warning|Saved|Discarded)\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g
    let m
    while ((m = lit.exec(t))) {
      if (m[1] === '`' && /\$\{/.test(m[2])) continue
      n++
    }
  }
  return n
}

/**
 * Informelles Du in Portal-Flächen (COPY-REGELN: immer Sie).
 * Website/Funnel/Ratgeber/GPT ausgenommen.
 */
function countDuImPortal() {
  let n = 0
  const re =
    /(?<![A-Za-zÄÖÜäöüß])(?:dein|deine|deinen|deiner|deines|deinem|dich|dir)(?![A-Za-zÄÖÜäöüß])|(?<![A-Za-z])Du(?![A-Za-z])|(?<![A-Za-z])du (?=[a-zäöü])/g
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    const inUi =
      /components\/(portal|partner|org|shared|melden)\//.test(rel) ||
      /lib\/portal2\//.test(rel) ||
      /lib\/partner\//.test(rel) ||
      /lib\/portal-copy\//.test(rel)
    if (!inUi) continue
    if (/\/web-copy\//.test(rel)) continue
    // Kommentarzeilen überspringen grob
    for (const line of t.split('\n')) {
      const s = line.trim()
      if (!s || s.startsWith('//') || s.startsWith('*') || s.startsWith('/*')) continue
      const m = s.match(re)
      if (m) n += m.length
    }
  }
  return n
}

const metrics = {
  portal_button_files: filesMatching(/PortalButton/),
  portal_btn_on_button: portalBtnOnButtonOutsideCanonical(),
  portal_action_btn_raw: countInSrc(/portal-action-btn/g),
  portal_status_pill_files: filesMatching(/PortalStatusPill/),
  role_status_pill_files: filesMatching(/RoleStatusPill/),
  entity_detail_layout: filesMatching(/PortalEntityDetailLayout/),
  partner_detail_section: filesMatching(/PartnerDetailSection/),
  portal_detail_card: filesMatching(/PortalDetailCard/),
  portal_flow_timeline: filesMatching(/PortalFlowTimeline/),
  vorgang_timeline: filesMatching(/VorgangTimeline/),
  portal_content_busy: filesMatching(/PortalContentBusy/),
  portal_inbox_empty: filesMatching(/PortalInboxEmpty/),
  portal_detail_error: filesMatching(/PortalDetailError/),
  portal_sticky_actions: filesMatching(/PortalDetailStickyActions/),
  portal_action_menu: filesMatching(/PortalActionMenu/),
  sonner_import_files: filesMatching(/from ['"]sonner['"]/),
  portal_toast_files: filesMatching(/portal-toast|portalToast/),
  in_kuerze: countInSrc(/IN KÜRZE/g),
  cta_button_files: filesMatching(/CTAButton/),
  website_cta_classes: (() => {
    // Alte CTA-Klassen außerhalb von <CTAButton … /> (tsx)
    const CLASS =
      /\b(?:hero-btn-primary|final-cta-btn-primary|conversion-btn-primary|btn-primary|cta-btn|hero-cta|page-hero-btn-main|page-hero-btn-secondary|final-cta-action-primary|final-cta-action-ghost|btn-hero-action|conversion-btn-main(?!-)|conversion-btn-secondary|conversion-sticky-cta|gpt-viz-btn|gpt-guided-primary-btn|komplex-card-cta|leistung-card-cta-link)\b/g
    let n = 0
    for (const [p, t] of texts) {
      const rel = relative(ROOT, p).replace(/\\/g, '/')
      if (!/\.tsx$/.test(rel)) continue
      if (/\/CTAButton\.tsx$/.test(rel)) continue
      const without = t.replace(/<CTAButton\b[\s\S]*?\/>/g, '')
      const m = without.match(CLASS)
      if (m) n += m.length
    }
    return n
  })(),
  website_fl_hex: (() => {
    const HEX = /(?<!&)#[0-9a-fA-F]{3,8}\b/g
    const files = [
      'src/app/baerenwald-landing.css',
      'src/components/gpt/gpt-viz.css',
      'src/components/gpt/guided-chat.css',
      'src/components/products/conversion-widget.css',
    ]
    let n = 0
    for (const rel of files) {
      const t = readSafe(join(ROOT, rel))
      for (const line of t.split('\n')) {
        if (/^\s*--[\w-]+:/.test(line)) continue
        const stripped = line.replace(/var\s*\(\s*--[^,)]+,\s*#[0-9a-fA-F]{3,8}\s*\)/g, 'var(--tok)')
        for (const m of stripped.matchAll(HEX)) {
          const h = m[0].toLowerCase()
          if (h === '#fff' || h === '#ffffff' || h === '#000' || h === '#000000') continue
          n++
        }
      }
    }
    return n
  })(),
  website_lucide_files: (() => {
    let n = 0
    const areas = /\/(home|landing|layout|leistungen|gpt|products|handwerker|ratgeber|ui)\//
    for (const [p, t] of texts) {
      const rel = relative(ROOT, p).replace(/\\/g, '/')
      if (!areas.test(rel) && !/baerenwald-landing-client/.test(rel)) continue
      if (/from\s+['"]lucide-react['"]/.test(t)) n++
    }
    return n
  })(),
  website_raw_svg_icon_files: (() => {
    let n = 0
    const areas = /\/(home|landing|layout|leistungen|gpt|products|ui)\//
    for (const [p, t] of texts) {
      const rel = relative(ROOT, p).replace(/\\/g, '/')
      if (!areas.test(rel) && !/baerenwald-landing-client/.test(rel)) continue
      if (/SectionDivider|WaveUnderline|mock-icon-svgs|ProgressBar/.test(rel)) continue
      if (/<svg[\s>]/.test(t) || /MockIconSvg\b/.test(t)) n++
    }
    return n
  })(),
  i18n_files: filesMatching(/useTranslation|i18next|from ['"].*i18n/),
  copy_portal:
    fileExists('src/lib/portal-copy') ||
    fileExists('src/lib/copy') ||
    fileExists('src/lib/portal/copy.ts') ||
    fileExists('src/lib/portal2/copy.ts'),
  freie_leertexte: countFreieLeertexte(),
  toast_ohne_copy: countToastOhneCopy(),
  du_im_portal: countDuImPortal(),
  /** 0 = Melde, Abnahme(CRM), Partner-Abschluss, Staff haben Zwischenstand. */
  lange_formulare_ohne_zwischenstand: (() => {
    const crmRoot = process.env.CRM_ROOT || join(ROOT, '..', 'baerenwald-system')
    const checks = [
      {
        path: join(crmRoot, 'src/components/anfragen/staff-funnel/StaffFunnelWizard.tsx'),
        marker: 'FORM_ZWISCHENSTAND: staff-funnel',
      },
      {
        path: join(crmRoot, 'src/components/auftraege/AbnahmeprotokollCreateWizard.tsx'),
        marker: 'FORM_ZWISCHENSTAND: abnahme',
      },
      {
        path: join(ROOT, 'src/components/funnel/use-portal-funnel-host.ts'),
        marker: 'FORM_ZWISCHENSTAND: melde-funnel',
      },
      {
        path: join(ROOT, 'src/components/partner/PartnerAbnahmeAbschlussSheet.tsx'),
        marker: 'FORM_ZWISCHENSTAND: partner-abschluss',
      },
    ]
    let missing = 0
    for (const c of checks) {
      const t = readSafe(c.path)
      if (!t.includes(c.marker) || !t.includes('useFormZwischenstand')) missing++
    }
    return missing
  })(),
  /** 0 = PortalModalShell Auto-Dirty. */
  portal_dialoge_ohne_dirtyschutz: (() => {
    const shell = readSafe(join(ROOT, 'src/components/shared/PortalModalShell.tsx'))
    return shell.includes('useAutoFormDirty') ? 0 : 1
  })(),
  foreign_tokens: foreignTokens(),
  primary_green_vars: countInSrc(/--(?:p2|fl|org)?-?(?:primary|brand|green)[^:]*:/g),
  rechner_files: filesMatching(/[Rr]echner/),
  files_over_1000: filesOverLines(1000),
  eslint: hasEslint(),
  ci: hasCi(),
  sentry_pkg: pkgHas('@sentry/nextjs'),
  audit_status: fileExists('scripts/audit-status.mjs'),
  sync_guard: fileExists('scripts/check-shared-domain-sync.mjs'),
  silent_catch: countInSrc(/\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g),
  logDbError_calls: countInSrc(/logDbError\s*\(/g),
  /* P5-19 Token-Konsolidierung */
  text_px: countInSrc(/text-\[\d+(?:\.\d+)?px\]/g),
  rounded_off_token: (() => {
    const RE = /(?<=["'`\s])rounded(?:-(?:sm|md|lg|xl|2xl|3xl|full))?(?=["'`\s])(?!\s*=)/g
    const ALLOW = new Set(['rounded-card', 'rounded-button', 'rounded-field', 'rounded-pill', 'rounded-sheet'])
    let n = 0
    for (const t of texts.values()) {
      let m
      RE.lastIndex = 0
      while ((m = RE.exec(t))) {
        if (!ALLOW.has(m[0])) n++
      }
    }
    return n
  })(),
  lucide_ausserhalb_icon: (() => {
    let n = 0
    for (const [p, t] of texts) {
      const rel = relative(ROOT, p).replace(/\\/g, '/')
      if (/\/PortalIcon\.tsx$|\/MockIcon\.tsx$|\/mock-icons\.ts$|\/portal2\/mock-icons/.test(rel)) continue
      if (/from\s+['"]lucide-react['"]/.test(t)) n++
    }
    return n
  })(),
  raw_svg: (() => {
    let n = 0
    for (const [p, t] of texts) {
      const rel = relative(ROOT, p).replace(/\\/g, '/')
      if (/\/PortalIcon|\/MockIcon|\/mock-icon|situation-icons|PdfFileIcon/.test(rel)) continue
      if (/<svg[\s>]/.test(t)) n++
    }
    return n
  })(),
  bwicon_imports: filesMatching(/from ['"]@\/components\/ui\/BwIcon['"]|from ['"][^'"]*BwIcon['"]/),
  hex_code: (() => {
    const HEX = /(?<!&)#[0-9a-fA-F]{3,8}\b/g
    let n = 0
    for (const [p, t] of texts) {
      const rel = relative(ROOT, p).replace(/\\/g, '/')
      if (
        /globals\.css$|\/tokens|\/templates\/|baerenwald-landing|\/lib\/tokens\/|\/portal2\/(?:role-badge|mieterwechsel|servicepakete|brand-presets)|\/gpt-viz\/|generate-.*-pdf|portal-detail-format/.test(
          rel
        )
      ) {
        continue
      }
      const stripped = t
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1')
        .replace(/var\s*\(\s*--[^,)]+,\s*#[0-9a-fA-F]{3,8}\s*\)/g, 'var(--tok)')
      const m = stripped.match(HEX)
      if (m) n += m.length
    }
    return n
  })(),
  tw_std: countInSrc(/\b(?:bg|text|border|ring)-(?:red|green|blue|gray|slate|zinc|amber|yellow|emerald|indigo|orange|rose|pink|purple|violet|cyan|sky|lime|teal|neutral|stone|fuchsia)-\d{2,3}\b/g),
  inline_static: (() => {
    let n = 0
    for (const t of texts.values()) {
      const re = /style=\{\{([\s\S]*?)\}\}/g
      let m
      while ((m = re.exec(t))) {
        const body = m[1]
        if (/var\s*\(/.test(body)) continue
        if (/#[0-9a-fA-F]{3,8}|\b\d+px\b|rgb\s*\(|hsl\s*\(/.test(body)) n++
      }
    }
    return n
  })(),
  important: (() => {
    let n = 0
    for (const p of walk(join(ROOT, 'src')).filter((f) => /\.css$/.test(f))) {
      const t = readSafe(p)
      const m = t.match(/!important/g)
      if (m) n += m.length
    }
    return n
  })(),
  /** P6-18: PortalField mit error= */
  portalfield_error_genutzt: (() => {
    let n = 0
    for (const t of texts.values()) {
      const re = /<PortalField\b[\s\S]*?\berror=/g
      const m = t.match(re)
      if (m) n += m.length
    }
    return n
  })(),
  /** P6-18: Validierungs-Toasts bitte_* → Feldfehler */
  toast_validierung: countInSrc(/portalToastError\(\s*TOAST\.bitte_/g),
  /** P6-18: Roh-.message in Error-Toasts */
  raw_error_message_toast: (() => {
    let n = 0
    for (const t of texts.values()) {
      const re =
        /portalToastError\(\s*(?:[^)]*\.)?message\b|portalToastError\(\s*(?:e|err|error)\s+instanceof\s+Error\s*\?\s*(?:e|err|error)\.message/g
      const m = t.match(re)
      if (m) n += m.length
    }
    return n
  })(),
  /** P6-18: confirmDisabled mit Feld-Leere (busy/pending/saving/loading ok) */
  confirm_disabled: (() => {
    let n = 0
    for (const t of texts.values()) {
      const re = /confirmDisabled=\{([^}]*)\}/g
      let m
      while ((m = re.exec(t))) {
        const expr = m[1]
        if (/busy|pending|saving|loading|submitting/.test(expr) && !/\.trim\(|\.length\s*<|==\s*null|===\s*null|parsed\s*==/.test(expr)) {
          continue
        }
        if (/\.trim\(|\.length\s*<|==\s*null|===\s*null|parsed\s*==|!\w+\s*\|\||\|\|\s*!\w+/.test(expr)) {
          n++
        }
      }
    }
    return n
  })(),

  /* ─── P6-19 Portal-Oberflächen-Konsolidierung ─── */
  ...(() => {
    const SURFACE =
      /components\/(portal|partner|org|shared|melden)\//
    const RAW_BTN_ALLOW =
      /PortalButton\.tsx$|PortalFormControls\.tsx$|AuthPrimitives\.tsx$|MieterWlFrame\.tsx$|PortalModalShell\.tsx$|PortalSheetConfirm\.tsx$|PortalSectionAddButton/
    /** Primitives + native file-inputs (Kamera/Upload/Signatur). */
    const RAW_INPUT_FILE_ALLOW =
      /PortalFormControls\.tsx$|PortalField\.tsx$|SignatureCanvas|PhotoUpload|FileUpload/
    const RAW_FIELD_ALLOW = /PortalFormControls\.tsx$/
    function portalFiles() {
      return [...texts.entries()].filter(([p]) => SURFACE.test(relative(ROOT, p).replace(/\\/g, '/')))
    }
    function countRaw(tagRe, allowFileRe) {
      let n = 0
      for (const [p, t] of portalFiles()) {
        const rel = relative(ROOT, p).replace(/\\/g, '/')
        if (allowFileRe.test(rel)) continue
        const m = t.match(tagRe)
        if (m) n += m.length
      }
      return n
    }
    /** Pro-Match: type=hidden|file zählen nicht als raw_input. */
    function countRawInput() {
      function tagEnd(t, start) {
        let i = start + 1
        let quote = null
        let brace = 0
        while (i < t.length) {
          const c = t[i]
          if (quote) {
            if (c === '\\') {
              i += 2
              continue
            }
            if (c === quote) quote = null
            i++
            continue
          }
          if (c === '"' || c === "'" || c === '`') {
            quote = c
            i++
            continue
          }
          if (c === '{') {
            brace++
            i++
            continue
          }
          if (c === '}') {
            brace = Math.max(0, brace - 1)
            i++
            continue
          }
          if (brace > 0) {
            i++
            continue
          }
          if (c === '>') return i
          i++
        }
        return -1
      }
      let n = 0
      for (const [p, t] of portalFiles()) {
        const rel = relative(ROOT, p).replace(/\\/g, '/')
        if (RAW_INPUT_FILE_ALLOW.test(rel)) continue
        const re = /<input\b/gi
        let m
        while ((m = re.exec(t))) {
          const end = tagEnd(t, m.index)
          if (end < 0) break
          const tag = t.slice(m.index, end + 1)
          const tm = tag.match(/\btype\s*=\s*['"]([^'"]+)['"]/i)
          const typ = (tm ? tm[1] : 'text').toLowerCase()
          if (typ === 'hidden' || typ === 'file') continue
          n++
        }
      }
      return n
    }
    const detailPages = [
      'src/components/portal/PortalVorgangDetail.tsx',
      'src/components/org/OrganisationHvVorgangDetail.tsx',
      'src/components/org/OrganisationObjektDetail.tsx',
      'src/components/partner/PartnerAuftragDetail.tsx',
      'src/components/partner/PartnerOffenDetail.tsx',
      'src/components/partner/PartnerEinholungDetail.tsx',
      'src/components/partner/PartnerAuftragAnfrageDetail.tsx',
    ]
    let stickyFehlt = 0
    for (const rel of detailPages) {
      const t = readSafe(join(ROOT, rel))
      if (!t) continue
      if (!t.includes('PortalDetailStickyActions')) stickyFehlt++
    }
    return {
      raw_button: countRaw(/<button\b/g, RAW_BTN_ALLOW),
      raw_input: countRawInput(),
      raw_select: countRaw(/<select\b/g, RAW_FIELD_ALLOW),
      raw_checkbox: countRaw(/type\s*=\s*['"]checkbox['"]/g, RAW_FIELD_ALLOW),
      raw_date: countRaw(/type\s*=\s*['"]date['"]/g, RAW_FIELD_ALLOW),
      raw_textarea: countRaw(/<textarea\b/g, RAW_FIELD_ALLOW),
      button_ohne_variante: (() => {
        let n = 0
        for (const [, t] of portalFiles()) {
          const re = /<(?:PortalButton|ActionBtn)\b([^>]*?)(?:\/>|>)/g
          let m
          while ((m = re.exec(t))) {
            if (!/\bvariant=/.test(m[1])) n++
          }
        }
        return n
      })(),
      sticky_fehlt: stickyFehlt,
      listenformen: (() => {
        let n = 0
        if (fileExists('src/components/partner/PartnerListPagination.tsx')) {
          const t = readSafe(join(ROOT, 'src/components/partner/PartnerListPagination.tsx'))
          if (t && !/re-?export|from ['"]@\/components\/shared\/PortalListPagination['"]/.test(t) && /function\s+PartnerListPagination/.test(t)) n++
        }
        // Eigenständige Listen-APIs neben PortalListCard
        for (const [p, t] of portalFiles()) {
          const rel = relative(ROOT, p).replace(/\\/g, '/')
          if (/PortalListCard\.tsx$|PortalEntityList\.tsx$|PortalListTable\.tsx$|PortalListPagination\.tsx$/.test(rel)) continue
          if (/function\s+PartnerVorgangListFilterBar\b/.test(t)) n++
        }
        return n
      })(),
      filter_varianten: (() => {
        let n = 0
        for (const [p, t] of portalFiles()) {
          if (/function\s+PartnerVorgangListFilterBar\b/.test(t)) n++
          if (/function\s+HvObjektFilterPopover\b/.test(t)) n++
          if (/function\s+StatusFilter\b/.test(t) && !/PortalListeFilterBar/.test(relative(ROOT, p))) n++
        }
        return n
      })(),
      status_varianten: (() => {
        let n = 0
        for (const [p, t] of portalFiles()) {
          const rel = relative(ROOT, p).replace(/\\/g, '/')
          if (/PortalStatusPill\.tsx$/.test(rel)) continue
          if (/function\s+StatusPill\b/.test(t)) n++
          if (/function\s+StatusChip\b/.test(t)) n++
          if (/function\s+PortalRoleBadge\b/.test(t)) n++
          if (/function\s+AttentionCornerBadge\b/.test(t)) n++
          if (/function\s+PortalFlowStatusChip\b/.test(t)) n++
        }
        return n
      })(),
      detail_rahmen: (() => {
        let n = 0
        if (fileExists('src/components/shared/PortalEntityDetailLayout.tsx')) n++
        // PortalDetailLayout als separate Datei zählt; Alias in PortalDetailUi ok wenn nur Re-Export
        const dui = readSafe(join(ROOT, 'src/components/shared/PortalDetailUi.tsx'))
        if (/export\s+function\s+PortalDetailLayout\b/.test(dui)) n++
        return n
      })(),
      dialog_varianten: (() => {
        let n = 0
        // Eigenständige Dialog-Implementierungen neben PortalModalShell
        for (const [p, t] of portalFiles()) {
          const rel = relative(ROOT, p).replace(/\\/g, '/')
          if (/PortalModalShell\.tsx$|PortalSheetConfirm\.tsx$|PortalEinstellungenUi\.tsx$|PortalDetailUi\.tsx$/.test(rel)) continue
          if (/function\s+PortalConfirmDialog\b/.test(t) && !/PortalSheetConfirm/.test(t)) n++
        }
        return n
      })(),
      fehler_varianten: (() => {
        let n = 0
        for (const [p, t] of portalFiles()) {
          const rel = relative(ROOT, p).replace(/\\/g, '/')
          if (/PortalDetailError|PortalDetailUi\.tsx$/.test(rel)) continue
          if (/function\s+PartnerDetailError\b/.test(t) && !/PortalDetailError/.test(t)) n++
        }
        // Alias-Datei die nur re-exportet = 0
        const pdu = readSafe(join(ROOT, 'src/components/partner/PartnerDetailUi.tsx'))
        if (pdu && /function\s+PartnerDetailError\b/.test(pdu) && !/PortalDetailError/.test(pdu)) n++
        return n
      })(),
      lade_varianten: (() => {
        let n = 0
        for (const [p, t] of portalFiles()) {
          const rel = relative(ROOT, p).replace(/\\/g, '/')
          if (/PortalContentBusy|PortalDetailUi|PortalAuthBusy/.test(rel)) continue
          // Dünner Alias auf PortalContentBusy zählt nicht
          if (
            /PortalInlineLoading\.tsx$/.test(rel) &&
            /PortalContentBusy/.test(t)
          ) {
            continue
          }
          if (/function\s+PortalInlineLoading\b/.test(t)) n++
          if (/from\s+['"]lucide-react['"].*Loader2|Loader2/.test(t) && /lucide-react/.test(t)) n++
        }
        return n
      })(),
      timeline_varianten: (() => {
        let n = 0
        for (const [p, t] of portalFiles()) {
          const rel = relative(ROOT, p).replace(/\\/g, '/')
          if (/PortalFlowTimeline/.test(rel)) continue
          // Re-Export ohne eigene function
          if (
            /MieterStgTimeline\.tsx$/.test(rel) &&
            /PortalFlowTimeline/.test(t) &&
            !/function\s+MieterStgTimeline\b/.test(t)
          ) {
            continue
          }
          if (/function\s+MieterStgTimeline\b/.test(t)) n++
          if (/function\s+VorgangTimeline\b/.test(t)) n++
        }
        return n
      })(),
    }
  })(),
}

const todos = [
  {
    id: 'P6-1',
    title: 'Tokens trennen Portal vs Website',
    check: () => metrics.foreign_tokens === 0,
    target: `foreign_tokens=0 (ist ${metrics.foreign_tokens})`,
  },
  {
    id: 'P6-2',
    title: 'Primärgrün eine Variable je App',
    check: () =>
      fileExists('docs/P6-2-primary-green.md') &&
      !hasP2GreenHexDupes() &&
      hasCanonicalPrimaries(),
    target: 'eine Primary-Var Portal (--p2-primary), eine Website (--fl-accent)',
  },
  {
    id: 'P6-3',
    title: 'PortalButton Standard (Baseline)',
    baseline: true,
    check: () => metrics.portal_button_files > 0 && fileExists('src/components/portal/PortalButton.tsx'),
  },
  {
    id: 'P6-4',
    title: 'Rest portal-btn → PortalButton',
    check: () => metrics.portal_btn_on_button === 0,
    target: `portal_btn_on_button=0 (ist ${metrics.portal_btn_on_button})`,
  },
  {
    id: 'P6-5',
    title: 'Status → PortalStatusPill',
    check: () => metrics.portal_status_pill_files > 0 && metrics.role_status_pill_files === 0,
    target: 'nur PortalStatusPill (+ Wrapper ok wenn dünn)',
  },
  {
    id: 'P6-6',
    title: 'Detail-Rahmen PortalEntityDetailLayout',
    check: () => metrics.entity_detail_layout > 0 && metrics.partner_detail_section === 0,
    target: 'PartnerDetailSection → PortalDetailCard; EntityDetailLayout',
  },
  {
    id: 'P6-7',
    title: 'Sticky Actions + PortalActionMenu (E8b)',
    check: () => {
      const roleFiles = [
        'src/components/partner/PartnerClient.tsx',
        'src/components/portal/PortalClient.tsx',
        'src/components/portal/EigentuemerPortalClient.tsx',
        'src/components/portal/HausmeisterPortalClient.tsx',
      ]
      const rolesOk = roleFiles.every((f) => {
        const t = readSafe(join(ROOT, f))
        return t && /PortalActionMenu/.test(t)
      })
      const partnerSticky =
        readSafe(join(ROOT, 'src/components/partner/PartnerAuftragDetail.tsx'))?.includes(
          'PortalDetailStickyActions'
        ) ?? false
      return (
        metrics.portal_sticky_actions >= 7 &&
        partnerSticky &&
        metrics.portal_action_menu >= 14 &&
        rolesOk
      )
    },
    target: `Sticky≥7 inkl. PartnerAuftrag (ist ${metrics.portal_sticky_actions}); ActionMenu alle Rollen (ist ${metrics.portal_action_menu})`,
  },
  {
    id: 'P6-8',
    title: 'Laden/Leer/Fehler Standards',
    check: () => {
      const inline = readSafe(join(ROOT, 'src/components/shared/PortalInlineLoading.tsx')) || ''
      const auth = readSafe(join(ROOT, 'src/components/portal/auth/PortalAuthBusy.tsx')) || ''
      return (
        metrics.portal_content_busy > 0 &&
        metrics.portal_inbox_empty > 0 &&
        metrics.portal_detail_error > 0 &&
        /PortalContentBusy/.test(inline) &&
        /PortalContentBusy/.test(auth)
      )
    },
    target: 'Nur PortalContentBusy / InboxEmpty / DetailError (Inline/Auth = Wrapper)',
  },
  {
    id: 'P6-9',
    title: 'Verlauf PortalFlowTimeline',
    check: () =>
      metrics.portal_flow_timeline > 0 &&
      metrics.vorgang_timeline === 0 &&
      !fileExists('src/components/shared/VorgangTimeline.tsx') &&
      !fileExists('src/components/shared/PortalAuftragPhasenStrip.tsx'),
    target: 'Nur PortalFlowTimeline; VorgangTimeline / PhasenStrip weg',
  },
  {
    id: 'P6-10',
    title: 'sonner entfernt; nur portal-toast',
    check: () => metrics.sonner_import_files === 0 || (metrics.sonner_import_files <= 1 && metrics.portal_toast_files > 0),
    target: 'direkter sonner-Import nur Toaster-intern',
  },
  {
    id: 'P6-11',
    title: 'i18n weg; Portal-Copy (E7)',
    check: () => metrics.i18n_files === 0 && metrics.copy_portal,
    target: 'i18n-Katalog gelöscht; Copy-Datei',
  },
  {
    id: 'P6-12',
    title: 'IN KÜRZE ausgeblendet',
    check: () => metrics.in_kuerze === 0,
    target: `IN KÜRZE=0 (ist ${metrics.in_kuerze}) — Menüpunkte ausblenden, kein Layout-Umbau`,
  },
  {
    id: 'P6-13',
    title: 'Website-CTAs → CTAButton',
    check: () =>
      metrics.cta_button_files > 0 &&
      metrics.website_cta_classes === 0 &&
      metrics.website_fl_hex === 0 &&
      metrics.website_lucide_files === 0,
    target: `CTAButton; cta-Klassen=0 fl_hex=0 lucide=0 (ist ${metrics.website_cta_classes}/${metrics.website_fl_hex}/${metrics.website_lucide_files})`,
  },
  {
    id: 'P6-14',
    title: 'Rechner eine Komponente / zwei Routen',
    check: () =>
      fileExists('src/components/funnel/BwRechnerPageClient.tsx') &&
      fileExists('src/app/rechner/page.tsx') &&
      fileExists('src/app/portal-tools/rechner/page.tsx') &&
      !fileExists('src/app/rechner/FunnelClient.tsx') &&
      !fileExists('src/app/portal-tools/rechner/FunnelClient.tsx'),
    target: 'BwRechnerPageClient + /rechner + /portal-tools/rechner; Duplikat-FunnelClient weg',
  },
  {
    id: 'P6-15',
    title: 'Copy-Regeln Portal (Leer/Toast/Sie)',
    check: () =>
      metrics.freie_leertexte === 0 &&
      metrics.toast_ohne_copy === 0 &&
      metrics.du_im_portal === 0 &&
      fileExists('docs/COPY-REGELN.md') &&
      fileExists('src/lib/portal-copy') &&
      fileExists('src/lib/web-copy'),
    target: `freie_leertexte=0 toast_ohne_copy=0 du_im_portal=0 (ist ${metrics.freie_leertexte}/${metrics.toast_ohne_copy}/${metrics.du_im_portal})`,
  },
  {
    id: 'P6-16',
    title: 'Dirty-Schutz PortalModalShell',
    check: () =>
      metrics.portal_dialoge_ohne_dirtyschutz === 0 &&
      fileExists('src/lib/portal2/form-dirty.ts'),
    target: `portal_dialoge_ohne_dirtyschutz=0 (ist ${metrics.portal_dialoge_ohne_dirtyschutz})`,
  },
  {
    id: 'P6-17',
    title: 'Zwischenstand lange Formulare',
    check: () =>
      metrics.lange_formulare_ohne_zwischenstand === 0 &&
      fileExists('src/lib/portal2/form-zwischenstand.ts'),
    target: `lange_formulare_ohne_zwischenstand=0 (Melde/Abnahme/Partner/Staff; ist ${metrics.lange_formulare_ohne_zwischenstand})`,
  },
  {
    id: 'P6-18',
    title: 'Feldvalidierung PortalField + System-Toasts',
    check: () =>
      metrics.portalfield_error_genutzt >= 2 &&
      metrics.toast_validierung === 0 &&
      metrics.raw_error_message_toast === 0 &&
      metrics.confirm_disabled === 0 &&
      fileExists('src/components/shared/PortalField.tsx') &&
      fileExists('src/lib/portal2/form-schema.ts'),
    target: `portalfield_error≥2 toast_validierung=0 raw_error_message_toast=0 confirm_disabled=0 (ist ${metrics.portalfield_error_genutzt}/${metrics.toast_validierung}/${metrics.raw_error_message_toast}/${metrics.confirm_disabled})`,
  },
  {
    id: 'P6-19',
    title: 'Portal-Oberflächen: Button/Feld/Liste/Status/Detail',
    check: () =>
      metrics.raw_button === 0 &&
      metrics.raw_input === 0 &&
      metrics.raw_select === 0 &&
      metrics.raw_checkbox === 0 &&
      metrics.raw_date === 0 &&
      metrics.raw_textarea === 0 &&
      metrics.button_ohne_variante === 0 &&
      metrics.sticky_fehlt === 0 &&
      metrics.listenformen === 0 &&
      metrics.filter_varianten === 0 &&
      metrics.status_varianten === 0 &&
      metrics.detail_rahmen === 1 &&
      metrics.dialog_varianten === 0 &&
      metrics.fehler_varianten === 0 &&
      metrics.lade_varianten === 0 &&
      metrics.timeline_varianten === 0 &&
      fileExists('src/components/shared/PortalFormControls.tsx'),
    target: `raw_*=0 button_ohne_variante=0 sticky_fehlt=0 listen/filter/status=0 detail_rahmen=1 dialog/fehler/lade/timeline=0 (ist btn=${metrics.raw_button} in=${metrics.raw_input} sel=${metrics.raw_select} cb=${metrics.raw_checkbox} date=${metrics.raw_date} ta=${metrics.raw_textarea} var=${metrics.button_ohne_variante} sticky=${metrics.sticky_fehlt} list=${metrics.listenformen} filt=${metrics.filter_varianten} st=${metrics.status_varianten} det=${metrics.detail_rahmen} dlg=${metrics.dialog_varianten} err=${metrics.fehler_varianten} load=${metrics.lade_varianten} tl=${metrics.timeline_varianten})`,
  },
  {
    id: 'P5-19',
    title: 'Schriftskala/Rundung/Icons/Farben Token-Konsolidierung',
    check: () =>
      metrics.text_px === 0 &&
      metrics.rounded_off_token === 0 &&
      metrics.lucide_ausserhalb_icon === 0 &&
      metrics.raw_svg === 0 &&
      metrics.bwicon_imports === 0 &&
      metrics.hex_code === 0 &&
      metrics.tw_std === 0 &&
      metrics.inline_static === 0 &&
      metrics.important <= 20,
    target: `text_px=0 rounded=0 lucide=0 raw_svg=0 bwicon=0 hex=0 tw_std=0 inline=0 important≤20 (ist ${metrics.text_px}/${metrics.rounded_off_token}/${metrics.lucide_ausserhalb_icon}/${metrics.raw_svg}/${metrics.bwicon_imports}/${metrics.hex_code}/${metrics.tw_std}/${metrics.inline_static}/${metrics.important})`,
  },
  {
    id: 'P1-3',
    title: 'Sentry-Code ohne DSN inaktiv',
    check: () => metrics.sentry_pkg,
    target: '@sentry/nextjs',
  },
  {
    id: 'P4-1',
    title: 'logDbError Reads',
    check: () => metrics.logDbError_calls > 20,
    target: `logDbError_calls (ist ${metrics.logDbError_calls})`,
  },
  {
    id: 'P4-2',
    title: 'Stille catches',
    check: () => metrics.silent_catch === 0,
    target: `silent_catch=0 (ist ${metrics.silent_catch})`,
  },
  {
    id: 'P2-4',
    title: 'Shared-Domain Sync-Guard',
    check: () => metrics.sync_guard,
    target: 'check-shared-domain-sync.mjs',
  },
  {
    id: 'P7-5',
    title: 'ESLint',
    check: () => metrics.eslint,
    target: 'ESLint aktiv',
  },
  {
    id: 'P7-6',
    title: 'CI',
    check: () => metrics.ci,
    target: 'GitHub Actions',
  },
  {
    id: 'P7-10',
    title: 'Große Dateien teilen',
    check: () => metrics.files_over_1000 < 5,
    target: `files>1000 <5 (ist ${metrics.files_over_1000})`,
  },
  {
    id: 'META-audit-status',
    title: 'audit-status.mjs',
    check: () => metrics.audit_status,
    target: 'scripts/audit-status.mjs',
  },
]

function statusOf(todo) {
  try {
    return todo.check() ? 'erledigt' : 'offen'
  } catch {
    return 'offen'
  }
}

const rows = todos.map((t) => ({
  id: t.id,
  title: t.title,
  status: statusOf(t),
  target: t.target || (t.baseline ? 'Baseline Belal' : ''),
}))

const summary = {
  erledigt: rows.filter((r) => r.status === 'erledigt').length,
  teilweise: rows.filter((r) => r.status === 'teilweise').length,
  offen: rows.filter((r) => r.status === 'offen').length,
  total: rows.length,
}

if (args.has('--json')) {
  console.log(JSON.stringify({ metrics, rows, summary }, null, 2))
} else {
  console.log('=== audit-status Portal (baerenwald) ===\n')
  console.log('Kennzahlen:')
  for (const [k, v] of Object.entries(metrics)) console.log(`  ${k}: ${v}`)
  console.log('\nTo-dos:')
  for (const r of rows) {
    const mark = r.status === 'erledigt' ? '✅' : '○'
    console.log(`  ${mark} ${r.id} ${r.status} — ${r.title}${r.target ? ` | Ziel: ${r.target}` : ''}`)
  }
  console.log(
    `\nSumme: erledigt ${summary.erledigt} · teilweise ${summary.teilweise} · offen ${summary.offen} · total ${summary.total}`
  )
}

function writeTodoMd() {
  const lines = []
  lines.push('# To-do Portal/Website (Audit) — Status aus audit-status.mjs')
  lines.push('')
  lines.push(`Stand: ${new Date().toISOString().slice(0, 10)} · Repo: baerenwald`)
  lines.push('')
  lines.push('**Regel:** Erledigt nur bei ✅ aus `node scripts/audit-status.mjs`.')
  lines.push('')
  lines.push('## Kennzahlen')
  lines.push('')
  lines.push('| Kennzahl | Ist |')
  lines.push('|----------|-----|')
  for (const [k, v] of Object.entries(metrics)) lines.push(`| \`${k}\` | ${v} |`)
  lines.push('')
  lines.push('## To-dos')
  lines.push('')
  lines.push('| ID | Status | Titel | Ziel |')
  lines.push('|----|--------|-------|------|')
  for (const r of rows) lines.push(`| ${r.id} | ${r.status} | ${r.title} | ${r.target || '—'} |`)
  lines.push('')
  lines.push(`Summe: erledigt **${summary.erledigt}** · offen **${summary.offen}** · total **${summary.total}**`)
  lines.push('')
  writeFileSync(join(ROOT, 'docs/TODO-ENTWICKLUNG.md'), lines.join('\n') + '\n')
  console.error(`\nWrote docs/TODO-ENTWICKLUNG.md`)
}

if (args.has('--write-todo')) writeTodoMd()
process.exit(0)
