/* global process, setTimeout, fetch, WebSocket, URLSearchParams, console */
import { mkdtemp, rm } from 'node:fs/promises'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:8080'
const allureRunId = process.env.E2E_ALLURE_RUN_ID
const allureSearch = process.env.E2E_ALLURE_SEARCH || ''
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
  const waitFor = async (expression, label) => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (await evaluate(expression)) return
      await delay(100)
    }
    throw new Error(`Timed out waiting for ${label}`)
  }
  const navigate = async (path) => {
    await command('Page.navigate', { url: `${baseUrl}${path}` })
    await waitFor("document.readyState === 'complete' && document.querySelector('h1')", path)
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
    await evaluate(`(() => {
      const input = document.querySelector('#runs-search')
      input.value = ${JSON.stringify(assignRunId)}
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })()`)
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
    await evaluate(`(() => {
      const input = document.querySelector('#project-name')
      input.value = ${JSON.stringify(assignProject)}
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })()`)
    await waitFor(
      "[...document.querySelectorAll('.modal-footer button')].some((button) => button.textContent.includes('Assign Project') && !button.disabled)",
      'enabled project assignment button'
    )
    await evaluate(
      "[...document.querySelectorAll('.modal-footer button')].find((button) => button.textContent.includes('Assign Project')).click()"
    )
    await waitFor(
      `${JSON.stringify(assignProject)} === [...document.querySelectorAll('#global-project-filter option')].find((option) => option.value === ${JSON.stringify(assignProject)})?.value && !document.querySelector('#project-name')`,
      'assigned project in global selector'
    )
    await evaluate(`(() => {
      const select = document.querySelector('#global-project-filter')
      select.value = ${JSON.stringify(assignProject)}
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })()`)
    await waitFor(
      `document.querySelector('#global-project-filter').value === ${JSON.stringify(assignProject)}`,
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
  if (allureRunId) {
    const query = new URLSearchParams({ run_id: allureRunId })
    if (allureSearch) query.set('search', allureSearch)
    await navigate(`/cases?${query}`)
    await waitFor(
      "document.querySelector('#cases-tag')?.options.length > 1 && document.querySelector('tbody tr') && !document.querySelector('.loading-cell')",
      'Allure cases and labels'
    )
    await evaluate("document.querySelector('tbody tr').click()")
    await waitFor(
      "[...document.querySelectorAll('[role=tab]')].some((tab) => tab.textContent.includes('Steps & Attachments'))",
      'Allure details tab'
    )
    await evaluate(
      "[...document.querySelectorAll('[role=tab]')].find((tab) => tab.textContent.includes('Steps & Attachments')).click()"
    )
    await waitFor(
      "document.querySelector('.allure-details a[href^=\"/api/v1/attachments/\"]') && document.querySelector('.allure-step')",
      'Allure steps and attachments'
    )
    allureVerified = true
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
        allureVerified,
        runOptionCounts,
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
