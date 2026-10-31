import { strict as assert } from 'node:assert'
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { connect } from 'node:net'
import { After, Given, Then, When, World, setWorldConstructor, setDefaultTimeout } from '@cucumber/cucumber'

const root = fileURLToPath(new URL('../../../', import.meta.url))
setDefaultTimeout(30000)

class Scenario extends World {
  backend?: ChildProcess
  website?: ChildProcess
  websiteUrl = ''
  backendUrl = ''
  response?: Response
  body = ''
  malformedResponses: string[] = []
}
setWorldConstructor(Scenario)

Given('the database is migrated and the website and backend are running', async function (this: Scenario) {
  execFileSync('pnpm', ['db:migrate'], { cwd: root, stdio: 'pipe', env: process.env })
  execFileSync('pnpm', ['db:migrate'], { cwd: root, stdio: 'pipe', env: process.env })
  this.backend = spawn(process.execPath, ['--import', 'tsx', 'apps/backend/src/main.ts'], {
    cwd: root,
    env: { ...process.env, BACKEND_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  this.backendUrl = 'http://localhost:' + await waitForPort(this.backend, 'Backend')
  this.website = spawn(process.execPath, ['--import', 'tsx', 'apps/website/src/main.ts'], {
    cwd: root,
    env: { ...process.env, WEBSITE_PORT: '0', BACKEND_URL: this.backendUrl },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  this.websiteUrl = 'http://localhost:' + await waitForPort(this.website, 'Website')
})

async function waitForPort(child: ChildProcess, name: string): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    let output = ''
    const timer = setTimeout(() => reject(new Error(`${name} startup timed out`)), 15000)
    child.stdout?.on('data', chunk => {
      output += String(chunk)
      const match = output.match(new RegExp(name + ' listening on port (\\d+)'))
      if (match) { clearTimeout(timer); resolve(Number(match[1])) }
    })
    child.stderr?.on('data', chunk => { output += String(chunk) })
    child.once('error', error => { clearTimeout(timer); reject(error) })
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`${name} exited ${code}: ${output}`)) })
  })
}

Given('the backend is ready', async function (this: Scenario) {
  const response = await fetch(this.backendUrl + '/ready')
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ready: true })
})

When('a visitor requests a greeting for {string}', async function (this: Scenario, name: string) {
  this.response = await fetch(`${this.websiteUrl}/?name=${encodeURIComponent(name)}`)
  this.body = await this.response.text()
})

Then('the website displays {string}', function (this: Scenario, message: string) {
  assert.equal(this.response?.status, 200)
  assert.ok(this.body.includes(`<h1>${message}</h1>`))
})

When('both applications receive a malformed request target', async function (this: Scenario) {
  this.malformedResponses = await Promise.all([this.backendUrl, this.websiteUrl].map(url => new Promise<string>((resolve, reject) => {
    const socket = connect(Number(new URL(url).port), '127.0.0.1')
    let response = ''
    socket.setTimeout(5000, () => socket.destroy(new Error('Request timed out')))
    socket.on('connect', () => socket.write('GET // HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n'))
    socket.on('data', chunk => { response += chunk.toString() })
    socket.on('error', reject)
    socket.on('end', () => resolve(response))
  })))
})

Then('both applications reject it and continue serving requests', async function (this: Scenario) {
  for (const response of this.malformedResponses) assert.match(response, /^HTTP\/1\.1 400 /)
  assert.equal((await fetch(this.backendUrl + '/ready')).status, 200)
  assert.equal((await fetch(this.websiteUrl + '/')).status, 200)
})

After(async function (this: Scenario) {
  for (const child of [this.website, this.backend]) {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit')
      child.kill('SIGTERM')
      await exited
    }
  }
})
