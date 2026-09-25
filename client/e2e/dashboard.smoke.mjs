/* global process, setTimeout, fetch, WebSocket, URLSearchParams, console */
import { mkdtemp, rm } from 'node:fs/promises'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:8080'
const allureRunId = process.env.E2E_ALLURE_RUN_ID
const allureSearch = process.env.E2E_ALLURE_SEARCH || ''
const htmlAttachmentId = process.env.E2E_HTML_ATTACHMENT_ID
const assignRunId = process.env.E2E_ASSIGN_RUN_ID
const assignProject = process.env.E2E_ASSIGN_PROJECT
const chromeBinary = process.env.CHROME_BIN || '/usr/bin/google-chrome'
const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9336)
const profileDirectory = await mkdtemp(join(tmpdir(), 'junit-dashboard-e2e-'))
const browser = spawn(
  chromeBinary,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDirectory}`,
    'about:blank',
  ],
  { stdio: 'ignore' }
)

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const requestJson = async (url, options) => {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return response.json()
}

let socket
try {
  let target
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      target = await requestJson(
        `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`${baseUrl}/runs`)}`,
        { method: 'PUT' }
      )
      break
    } catch {
      await delay(100)
    }
  }
  if (!target) throw new Error('Chrome DevTools endpoint did not become ready')

  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })

  let commandId = 0
  const pending = new Map()
  const browserErrors = []
  const apiErrors = []
  const requests = []
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const operation = pending.get(message.id)
      pending.delete(message.id)
      return message.error
        ? operation.reject(new Error(message.error.message))
        : operation.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown') {
      browserErrors.push(message.params.exceptionDetails.text)
    }
    if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url)
    if (
      message.method === 'Network.responseReceived' &&
      message.params.response.url.includes('/api/') &&
      message.params.response.status >= 400
    ) {
      apiErrors.push(`${message.params.response.status} ${message.params.response.url}`)
    }
  })

  const command = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++commandId
      pending.set(id, { resolve, reject })
      socket.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = async (expression) => {
    const result = await command('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result.value
  }
  const callFunction = async (functionDeclaration, ...values) => {
    const receiver = await command('Runtime.evaluate', { expression: 'globalThis' })
    const result = await command('Runtime.callFunctionOn', {
      objectId: receiver.result.objectId,
      functionDeclaration,
      arguments: values.map((value) => ({ value })),
      returnByValue: true,
      awaitPromise: true,
    })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result.value
  }
  const waitFor = async (expression, label) => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (await evaluate(expression)) return
      await delay(100)
    }
    throw new Error(`Timed out waiting for ${label}`)
  }
  const waitForFunction = async (functionDeclaration, values, label) => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (await callFunction(functionDeclaration, ...values)) return
      await delay(100)
    }
    throw new Error(`Timed out waiting for ${label}`)
  }
  const navigate = async (path) => {
    await command('Page.navigate', { url: `${baseUrl}${path}` })
    await waitFor("document.readyState === 'complete' && document.querySelector('h1')", path)
  }
  const inspectOpenedTarget = async (expectedUrl) => {
    let openedTarget
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const targets = await requestJson(`http://127.0.0.1:${debugPort}/json/list`)
      openedTarget = targets.find((item) => item.id !== target.id && item.url === expectedUrl)
      if (openedTarget) break
      await delay(100)
    }
    if (!openedTarget) {
      const created = await command('Target.createTarget', { url: expectedUrl })
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const targets = await requestJson(`http://127.0.0.1:${debugPort}/json/list`)
        openedTarget = targets.find((item) => item.id === created.targetId)
        if (openedTarget) break
        await delay(100)
      }
    }
    if (!openedTarget) throw new Error(`No browser target available for ${expectedUrl}`)

    const openedSocket = new WebSocket(openedTarget.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      openedSocket.addEventListener('open', resolve, { once: true })
      openedSocket.addEventListener('error', reject, { once: true })
    })
    let openedCommandId = 0
    const openedPending = new Map()
    openedSocket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (!message.id || !openedPending.has(message.id)) return
      const operation = openedPending.get(message.id)
      openedPending.delete(message.id)
      if (message.error) operation.reject(new Error(message.error.message))
      else operation.resolve(message.result)
    })
    const openedCommand = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++openedCommandId
        openedPending.set(id, { resolve, reject })
        openedSocket.send(JSON.stringify({ id, method, params }))
      })
    await openedCommand('Runtime.enable')

    let result
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const evaluation = await openedCommand('Runtime.evaluate', {
        expression: `({
          ready: document.readyState === 'complete',
          contentType: document.contentType,
          text: document.body?.innerText?.slice(0, 200) || '',
          hasApp: Boolean(document.querySelector('#app')),
          viewerText: document.querySelector('.attachment-content')?.textContent?.slice(0, 200) || '',
          viewerAnsiSpans: document.querySelectorAll('.attachment-content span[style*="color"]').length,
          viewerDocument: Boolean(document.querySelector('iframe.attachment-document[sandbox]')),
          viewerError: document.querySelector('.viewer-state.error')?.textContent || '',
        })`,
        returnByValue: true,
      })
      const value = evaluation.result.value
      if (
        value?.ready &&
        (value.contentType !== 'text/html' ||
          value.viewerText ||
          value.viewerDocument ||
          value.viewerError)
      ) {
        result = value
        break
      }
      await delay(100)
    }
    openedSocket.close()
    await command('Target.closeTarget', { targetId: openedTarget.id })
    if (!result) throw new Error(`Timed out inspecting ${expectedUrl}`)
    return result
  }

  await command('Runtime.enable')
  await command('Network.enable')
  await command('Page.enable')

  await waitFor(
    "document.querySelector('th[aria-sort=\"descending\"]')?.textContent.includes('Date')",
    'default run sorting'
  )
  await evaluate(
    `([...document.querySelectorAll('th button')].find((button) => button.textContent.includes('Run Name'))).click()`
  )
  await waitFor(
    "document.querySelector('th[aria-sort=\"ascending\"]')?.textContent.includes('Run Name') && !document.querySelector('.loading-cell')",
    'server-side run sorting'
  )
  const sortedRunsMatch = await evaluate(`(async () => {
    const shown = [...document.querySelectorAll('tbody .run-name strong')].map((node) => node.textContent.trim())
    const response = await fetch('/api/v1/runs?page=1&limit=50&sort_by=name&sort_order=asc')
    const body = await response.json()
    return shown.join('\\n') === body.data.runs.map((run) => run.name).join('\\n')
  })()`)
  if (!sortedRunsMatch) throw new Error('Run table does not match the server-sorted response')

  let projectAssigned = false
  if (assignRunId && assignProject) {
    await callFunction(
      `function (runId) {
      const input = document.querySelector('#runs-search')
      input.value = runId
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }`,
      assignRunId
    )
    await waitFor(
      "document.querySelectorAll('tbody tr').length === 1 && !document.querySelector('.loading-cell')",
      'run selected for project assignment'
    )
    await evaluate("document.querySelector('tbody .run-checkbox').click()")
    await waitFor(
      "[...document.querySelectorAll('button')].some((button) => button.textContent.includes('Assign Project'))",
      'Assign Project action'
    )
    await evaluate(
      "[...document.querySelectorAll('button')].find((button) => button.textContent.includes('Assign Project')).click()"
    )
    await waitFor("document.querySelector('#project-name')", 'project assignment dialog')
    await callFunction(
      `function (project) {
      const input = document.querySelector('#project-name')
      input.value = project
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }`,
      assignProject
    )
    await waitFor(
      "[...document.querySelectorAll('.modal-footer button')].some((button) => button.textContent.includes('Assign Project') && !button.disabled)",
      'enabled project assignment button'
    )
    await evaluate(
      "[...document.querySelectorAll('.modal-footer button')].find((button) => button.textContent.includes('Assign Project')).click()"
    )
    await waitForFunction(
      `function (project) {
        return project === [...document.querySelectorAll('#global-project-filter option')]
          .find((option) => option.value === project)?.value && !document.querySelector('#project-name')
      }`,
      [assignProject],
      'assigned project in global selector'
    )
    await callFunction(
      `function (project) {
      const select = document.querySelector('#global-project-filter')
      select.value = project
      select.dispatchEvent(new Event('change', { bubbles: true }))
    }`,
      assignProject
    )
    await waitForFunction(
      `function (project) {
        return document.querySelector('#global-project-filter').value === project
      }`,
      [assignProject],
      'assigned project selected globally'
    )
    await delay(400)
    if (
      !requests.some(
        (url) =>
          url.includes('/api/v1/runs?') &&
          url.includes(`job_name=${encodeURIComponent(assignProject)}`)
      )
    ) {
      throw new Error('Assigned project did not filter the run list')
    }
    projectAssigned = true
  }

  if (assignProject) {
    await evaluate('document.querySelector(\'a[href="/cases"]\').click()')
    await waitFor("document.querySelector('h1')?.textContent.includes('Test Cases')", '/cases')
  } else {
    await navigate('/cases')
  }
  await waitFor(
    "document.querySelector('.pagination-controls') && !document.querySelector('.loading-cell') && document.querySelectorAll('tbody tr').length > 1",
    'case pagination'
  )
  const caseRows = await evaluate("document.querySelectorAll('tbody tr').length")
  if (caseRows < 1 || caseRows > 50) throw new Error(`Unexpected case row count: ${caseRows}`)
  const caseBadgeAudit = await evaluate(`(() => {
    return [...document.querySelectorAll('tbody .status-badge')].every((badge) => {
      const status = badge.getAttribute('data-test-status')
      if (!status) return false
      const expected = document.createElement('span')
      expected.style.color = 'var(--status-' + status + ')'
      document.body.appendChild(expected)
      const matches = getComputedStyle(badge).color === getComputedStyle(expected).color
      expected.remove()
      return matches
    })
  })()`)
  if (!caseBadgeAudit) throw new Error('Case status badges do not use the shared palette')
  if (
    assignProject &&
    !requests.some(
      (url) =>
        url.includes('/api/v1/cases?') &&
        url.includes(`job_name=${encodeURIComponent(assignProject)}`)
    )
  ) {
    throw new Error('Assigned project did not filter the case list')
  }

  let allureVerified = false
  let caseSearchVerified = false
  let caseSortVerified = false
  let caseDateSortVerified = false
  let caseStatusSortVerified = false
  let caseFiltersVerified = false
  let darkModalVerified = false
  let attachmentNavigationVerified = false
  let htmlAttachmentPreviewVerified = false
  let modalTabsAudited = []
  let allureStepPaletteAudit = false
  if (allureRunId) {
    const query = new URLSearchParams({ run_id: allureRunId })
    await navigate(`/cases?${query}`)
    await waitFor(
      "document.querySelector('#cases-tag')?.options.length > 1 && document.querySelector('tbody tr') && !document.querySelector('.loading-cell')",
      'Allure cases and labels'
    )

    await waitFor(
      "document.querySelector('th[aria-sort=\"ascending\"]')?.textContent.includes('Test Name')",
      'default test-name sorting'
    )
    await evaluate(
      "[...document.querySelectorAll('th button')].find((button) => button.textContent.includes('Duration')).click()"
    )
    await waitFor(
      "document.querySelector('th[aria-sort=\"ascending\"]')?.textContent.includes('Duration') && !document.querySelector('.loading-cell')",
      'case duration sorting'
    )
    caseSortVerified = await evaluate(`(async () => {
      const shown = [...document.querySelectorAll('tbody .duration')].map((node) => node.textContent.trim())
      const response = await fetch('/api/v1/cases?page=1&limit=50&run_id=${allureRunId}&sort_by=time&sort_order=asc')
      const body = await response.json()
      const expected = body.data.cases.map((item) => {
        const milliseconds = (item.time || 0) * 1000
        if (milliseconds <= 0) return '0ms'
        if (milliseconds < 1000) return milliseconds.toFixed(0) + 'ms'
        if (milliseconds < 60000) return (milliseconds / 1000).toFixed(2) + 's'
        const hours = Math.floor(milliseconds / 3600000)
        const minutes = Math.floor((milliseconds % 3600000) / 60000)
        const seconds = Math.floor((milliseconds % 60000) / 1000)
        return [hours && hours + 'h', minutes && minutes + 'm', seconds && seconds + 's']
          .filter(Boolean)
          .join(' ')
      })
      return shown.join('\\n') === expected.join('\\n')
    })()`)
    if (!caseSortVerified) throw new Error('Case table does not match server-side duration sorting')

    await evaluate(
      "[...document.querySelectorAll('th button')].find((button) => button.textContent.includes('Run Date')).click()"
    )
    await waitFor(
      "document.querySelector('th[aria-sort=\"ascending\"]')?.textContent.includes('Run Date') && !document.querySelector('.loading-cell')",
      'case run-date sorting'
    )
    caseDateSortVerified = await evaluate(`(async () => {
      const shown = [...document.querySelectorAll('tbody .run-date')].map((node) => node.getAttribute('datetime'))
      const response = await fetch('/api/v1/cases?page=1&limit=50&run_id=${allureRunId}&sort_by=timestamp&sort_order=asc')
      const body = await response.json()
      return shown.join('\\n') === body.data.cases.map((item) => item.timestamp).join('\\n')
    })()`)
    if (!caseDateSortVerified) {
      throw new Error('Case table does not match server-side run-date sorting')
    }

    await evaluate(
      "[...document.querySelectorAll('th button')].find((button) => button.textContent.includes('Status')).click()"
    )
    await waitFor(
      "document.querySelector('th[aria-sort=\"ascending\"]')?.textContent.includes('Status') && !document.querySelector('.loading-cell')",
      'case status sorting'
    )
    caseStatusSortVerified = await evaluate(`(async () => {
      const shown = [...document.querySelectorAll('tbody .status-badge')]
        .map((node) => node.textContent.trim().split(/\\s+/).at(-1))
      const response = await fetch('/api/v1/cases?page=1&limit=50&run_id=${allureRunId}&sort_by=status&sort_order=asc')
      const body = await response.json()
      return shown.join('\\n') === body.data.cases.map((item) => item.status).join('\\n')
    })()`)
    if (!caseStatusSortVerified) {
      throw new Error('Case table does not match server-side status sorting')
    }

    await evaluate(`(() => {
      const select = document.querySelector('#cases-status')
      select.value = 'failed'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })()`)
    await waitFor(
      "document.querySelectorAll('tbody .status-badge').length > 0 && [...document.querySelectorAll('tbody .status-badge')].every((badge) => badge.textContent.includes('failed')) && !document.querySelector('.loading-cell')",
      'failed status filter'
    )
    await evaluate(`(() => {
      const status = document.querySelector('#cases-status')
      status.value = ''
      status.dispatchEvent(new Event('change', { bubbles: true }))
      const tag = document.querySelector('#cases-tag')
      tag.value = 'video'
      tag.dispatchEvent(new Event('change', { bubbles: true }))
    })()`)
    await waitFor(
      "document.querySelectorAll('tbody tr').length > 0 && !document.querySelector('.loading-cell')",
      'Allure tag filter'
    )
    await delay(400)
    if (
      !requests.some(
        (url) =>
          url.includes('/api/v1/cases?') &&
          url.includes('status=failed') &&
          url.includes(`run_id=${allureRunId}`)
      ) ||
      !requests.some(
        (url) =>
          url.includes('/api/v1/cases?') &&
          url.includes('tag=video') &&
          url.includes(`run_id=${allureRunId}`)
      )
    ) {
      throw new Error('Case status or tag filter request was not observed')
    }
    await evaluate(`(() => {
      const tag = document.querySelector('#cases-tag')
      tag.value = ''
      tag.dispatchEvent(new Event('change', { bubbles: true }))
    })()`)
    caseFiltersVerified = true

    if (allureSearch) {
      await callFunction(
        `function (search) {
        const input = document.querySelector('#cases-search')
        input.value = search
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }`,
        allureSearch
      )
      await waitForFunction(
        `function (search) {
          return document.querySelectorAll('tbody tr').length === 1 &&
            document.querySelector('tbody tr')?.textContent.includes(search) &&
            !document.querySelector('.loading-cell')
        }`,
        [allureSearch],
        'literal case search'
      )
      caseSearchVerified = true
    }

    if ((await evaluate("document.documentElement.getAttribute('data-theme')")) !== 'dark') {
      await evaluate("document.querySelector('.theme-toggle').click()")
      await waitFor(
        "document.documentElement.getAttribute('data-theme') === 'dark'",
        'dark theme activation'
      )
    }
    await evaluate("document.querySelector('tbody tr').click()")
    await waitFor(
      "[...document.querySelectorAll('[role=tab]')].some((tab) => tab.textContent.includes('Steps & Attachments'))",
      'Allure details tab'
    )
    await evaluate(
      "[...document.querySelectorAll('[role=tab]')].find((tab) => tab.textContent.includes('Steps & Attachments')).click()"
    )
    await waitFor(
      "document.querySelector('.allure-details a[href^=\"/attachments/\"]') && document.querySelector('.allure-step')",
      'Allure steps and attachments'
    )
    allureStepPaletteAudit = await evaluate(`(() => {
      return [...document.querySelectorAll('.allure-step .step-status')].every((step) => {
        const status = step.getAttribute('data-test-status')
        if (!status) return false
        const expected = document.createElement('span')
        expected.style.color = 'var(--status-' + status + ')'
        document.body.appendChild(expected)
        const matches = getComputedStyle(step).color === getComputedStyle(expected).color
        expected.remove()
        return matches
      })
    })()`)
    if (!allureStepPaletteAudit) throw new Error('Allure steps do not use the shared palette')
    modalTabsAudited = await evaluate(
      "[...document.querySelectorAll('[role=tab]')].map((tab) => tab.textContent.trim())"
    )
    for (const tabLabel of modalTabsAudited) {
      await callFunction(
        `function (label) {
        [...document.querySelectorAll('[role=tab]')]
          .find((tab) => tab.textContent.trim() === label).click()
      }`,
        tabLabel
      )
      await waitForFunction(
        `function (label) {
          return [...document.querySelectorAll('[role=tab]')]
            .some((tab) => tab.textContent.trim() === label && tab.getAttribute('aria-selected') === 'true')
        }`,
        [tabLabel],
        `${tabLabel} tab`
      )
      const tabAudit = await evaluate(`(() => {
        const probe = document.createElement('div')
        probe.style.background = 'var(--bg-tertiary)'
        document.body.appendChild(probe)
        const expectedFooter = getComputedStyle(probe).backgroundColor
        probe.remove()
        const modal = document.querySelector('.modal-content')
        const footer = modal.querySelector(':scope > .modal-footer')
        const lightColors = new Set(['rgb(255, 255, 255)', 'rgb(249, 250, 251)', 'rgb(243, 244, 246)'])
        const visibleLightSurfaces = [...modal.querySelectorAll('*')]
          .filter((element) => element.offsetParent !== null)
          .filter((element) => lightColors.has(getComputedStyle(element).backgroundColor))
          .map((element) => element.className || element.tagName)
        return {
          footer: getComputedStyle(footer).backgroundColor,
          expectedFooter,
          footerButtons: [...footer.querySelectorAll('button')].map((button) => button.textContent.trim()),
          hasCopyError: document.body.innerText.includes('Copy Error'),
          visibleLightSurfaces,
        }
      })()`)
      if (tabAudit.footer !== tabAudit.expectedFooter) {
        throw new Error(`${tabLabel} footer theme mismatch: ${tabAudit.footer}`)
      }
      if (tabAudit.footerButtons.join(',') !== 'Close' || tabAudit.hasCopyError) {
        throw new Error(`${tabLabel} has unexpected global actions`)
      }
      if (tabAudit.visibleLightSurfaces.length) {
        throw new Error(
          `${tabLabel} has light surfaces in dark mode: ${tabAudit.visibleLightSurfaces}`
        )
      }
    }
    await evaluate(
      "[...document.querySelectorAll('[role=tab]')].find((tab) => tab.textContent.includes('Steps & Attachments')).click()"
    )
    darkModalVerified = true

    const attachmentLinks = await evaluate(`
      [...document.querySelectorAll('.allure-details .attachments a[href^="/attachments/"]')]
        .map((link) => ({ label: link.textContent.trim(), href: link.getAttribute('href') }))
        .filter((link) => link.label.startsWith('View log') || link.label.startsWith('View stderr'))
    `)
    for (const expectedLabel of ['View log', 'View stderr']) {
      const attachment = attachmentLinks.find((link) => link.label.startsWith(expectedLabel))
      if (!attachment) throw new Error(`Missing ${expectedLabel} attachment link`)
      await callFunction(
        `function (label) {
        [...document.querySelectorAll('.allure-details .attachments a[href^="/attachments/"]')]
          .find((link) => link.textContent.trim().startsWith(label)).click()
      }`,
        expectedLabel
      )
      const attachmentPage = await inspectOpenedTarget(`${baseUrl}${attachment.href}`)
      if (
        attachmentPage.contentType !== 'text/html' ||
        !attachmentPage.hasApp ||
        attachmentPage.viewerError ||
        !attachmentPage.viewerText ||
        attachmentPage.viewerAnsiSpans < 1
      ) {
        throw new Error(
          `${expectedLabel} did not load in the attachment viewer: ${JSON.stringify(attachmentPage)}`
        )
      }
    }
    attachmentNavigationVerified = true
    allureVerified = true
  }

  if (htmlAttachmentId) {
    const attachmentPage = await inspectOpenedTarget(`${baseUrl}/attachments/${htmlAttachmentId}`)
    if (
      attachmentPage.contentType !== 'text/html' ||
      !attachmentPage.hasApp ||
      attachmentPage.viewerError ||
      !attachmentPage.viewerDocument
    ) {
      throw new Error(
        `HTML attachment did not load in a sandboxed preview: ${JSON.stringify(attachmentPage)}`
      )
    }
    htmlAttachmentPreviewVerified = true
  }

  await navigate('/compare')
  await waitFor(
    "document.querySelectorAll('.async-entity-select select').length === 2 && !document.body.innerText.includes('Loading options')",
    'run comparison selectors'
  )
  const runOptionCounts = await evaluate(
    "[...document.querySelectorAll('.async-entity-select select')].map((select) => select.options.length)"
  )
  if (runOptionCounts.some((count) => count > 26)) {
    throw new Error(`Run selectors are not bounded: ${runOptionCounts.join(', ')}`)
  }
  await evaluate(`(() => {
    const input = document.querySelector('.async-entity-select input[type=search]')
    input.value = 'GITHUB_CD_GATEWAY_TEST'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await delay(500)
  if (
    !requests.some(
      (url) => url.includes('/api/v1/runs?') && url.includes('search=GITHUB_CD_GATEWAY_TEST')
    )
  ) {
    throw new Error('Run selector search request was not observed')
  }

  await navigate('/releases')
  await waitFor(
    "document.querySelectorAll('.async-entity-select select').length === 2",
    'release selectors'
  )
  await evaluate(`(() => {
    const input = document.querySelector('.async-entity-select input[type=search]')
    input.value = '1.0'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await delay(500)
  if (!requests.some((url) => url.includes('/api/v1/releases?') && url.includes('search=1.0'))) {
    throw new Error('Release selector search request was not observed')
  }

  await navigate('/')
  await waitFor("document.querySelector('.stat-card.passed .stat-icon')", 'dashboard status cards')
  const statusPaletteAudit = await evaluate(`(async () => {
    const root = document.documentElement
    const originalTheme = root.getAttribute('data-theme')
    const mismatches = []
    const noTransition = document.createElement('style')
    noTransition.textContent = '* { transition-duration: 0s !important; }'
    document.head.appendChild(noTransition)
    for (const theme of ['light', 'dark']) {
      root.setAttribute('data-theme', theme)
      await new Promise((resolve) => requestAnimationFrame(resolve))
      for (const status of ['passed', 'failed', 'error', 'skipped', 'unknown']) {
        const target = document.querySelector('.stat-card.' + status + ' .stat-icon') ||
          Object.assign(document.createElement('span'), { className: 'status-fill' })
        if (!target.isConnected) document.body.appendChild(target)
        target.setAttribute('data-test-status', status)
        const expected = document.createElement('span')
        expected.style.color = 'var(--status-' + status + ')'
        expected.style.backgroundColor = 'var(--status-' + status + '-bg)'
        document.body.appendChild(expected)
        const actualStyle = getComputedStyle(target)
        const expectedStyle = getComputedStyle(expected)
        if (actualStyle.color !== expectedStyle.color ||
            actualStyle.backgroundColor !== expectedStyle.backgroundColor) {
          mismatches.push({
            theme,
            status,
            color: actualStyle.color,
            expectedColor: expectedStyle.color,
            background: actualStyle.backgroundColor,
            expectedBackground: expectedStyle.backgroundColor,
          })
        }
        expected.remove()
        if (!target.closest('.stat-card')) target.remove()
      }
    }
    if (originalTheme) root.setAttribute('data-theme', originalTheme)
    else root.removeAttribute('data-theme')
    noTransition.remove()
    return mismatches
  })()`)
  if (statusPaletteAudit.length) {
    throw new Error(`Dashboard status palette mismatch: ${JSON.stringify(statusPaletteAudit)}`)
  }

  await command('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 1,
    mobile: true,
  })
  const routeHeadings = {}
  for (const path of ['/', '/runs', '/cases', '/upload', '/releases', '/compare', '/performance']) {
    await navigate(path)
    const layout = await evaluate(`({
      heading: document.querySelector('h1')?.textContent.trim(),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    })`)
    if (!layout.heading) throw new Error(`Missing heading on ${path}`)
    if (layout.overflow) throw new Error(`Horizontal page overflow on ${path}`)
    if (path === '/') {
      const chartFits = await evaluate(`(() => {
        const card = document.querySelector('.charts-grid .chart-card')
        const chart = card?.querySelector('[role="img"]')
        return !!card && !!chart &&
          card.getBoundingClientRect().right <= window.innerWidth + 1 &&
          chart.getBoundingClientRect().right <= card.getBoundingClientRect().right + 1
      })()`)
      if (!chartFits) throw new Error('Test distribution chart does not fit its mobile card')
    }
    routeHeadings[path] = layout.heading
  }

  if (browserErrors.length) throw new Error(`Browser exceptions: ${browserErrors.join('; ')}`)
  if (apiErrors.length) throw new Error(`API failures: ${apiErrors.join('; ')}`)
  console.log(
    JSON.stringify(
      {
        sortedRunsMatch,
        projectAssigned,
        caseRows,
        caseBadgeAudit,
        allureVerified,
        caseSearchVerified,
        caseSortVerified,
        caseDateSortVerified,
        caseStatusSortVerified,
        caseFiltersVerified,
        darkModalVerified,
        modalTabsAudited,
        allureStepPaletteAudit,
        attachmentNavigationVerified,
        htmlAttachmentPreviewVerified,
        runOptionCounts,
        statusPaletteAudit,
        routeHeadings,
        browserErrors: 0,
        apiErrors: 0,
      },
      null,
      2
    )
  )
} finally {
  socket?.close()
  browser.kill('SIGTERM')
  await Promise.race([once(browser, 'exit'), delay(2000)])
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
}
