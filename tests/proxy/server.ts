/**
 * Test Proxy Server
 * Local HTTP proxy that handles CORS and injects authentication for PI Web API
 */

import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'
import type { TestProxyConfig } from './config'

export interface ProxyRequestInfo {
  method: string
  url: string
  statusCode: number
  duration: number
}

/**
 * Create a test proxy server
 */
export function createTestProxy(config: TestProxyConfig) {
  const server = http.createServer(async (req, res) => {
    const startTime = Date.now()

    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Bypass-Cache')
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    try {
      // Build target URL
      const targetUrl = new URL(req.url || '/', config.piWebApiUrl)

      if (config.logRequests) {
        console.log(`→ ${req.method} ${targetUrl.pathname}${targetUrl.search}`)
      }

      // Prepare request options
      const isHttps = targetUrl.protocol === 'https:'
      const httpModule = isHttps ? https : http

      // Build authentication header
      let authHeader: string | undefined
      if (config.auth.type === 'basic') {
        const credentials = Buffer.from(
          `${config.auth.username}:${config.auth.password}`
        ).toString('base64')
        authHeader = `Basic ${credentials}`
      } else if (config.auth.type === 'ntlm' && config.auth.domain) {
        // For NTLM, we'll use the domain\username format
        // Note: Full NTLM handshake requires a dedicated library like 'httpntlm'
        // For now, we'll use basic auth format and let the server handle it
        const credentials = Buffer.from(
          `${config.auth.domain}\\${config.auth.username}:${config.auth.password}`
        ).toString('base64')
        authHeader = `Basic ${credentials}`
      }

      // Prepare headers
      const headers: Record<string, string> = {
        ...Object.fromEntries(
          Object.entries(req.headers)
            .filter(([key]) => key.toLowerCase() !== 'host')
            .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value || ''])
        ),
        host: targetUrl.host,
      }

      if (authHeader) {
        headers.authorization = authHeader
      }

      // Make request to PI Web API
      const proxyReq = httpModule.request(
        {
          hostname: targetUrl.hostname,
          port: targetUrl.port,
          path: targetUrl.pathname + targetUrl.search,
          method: req.method,
          headers,
          rejectUnauthorized: false, // Allow self-signed certificates in test
        },
        (proxyRes) => {
          const duration = Date.now() - startTime

          if (config.logRequests) {
            console.log(`← ${proxyRes.statusCode} ${req.method} ${targetUrl.pathname} (${duration}ms)`)
          }

          // Forward response
          res.writeHead(proxyRes.statusCode || 500, proxyRes.headers)
          proxyRes.pipe(res)
        }
      )

      proxyReq.on('error', (error) => {
        console.error(`✗ Proxy error: ${error.message}`)
        res.writeHead(502)
        res.end(
          JSON.stringify({
            error: 'Proxy error',
            message: error.message,
            target: targetUrl.toString(),
          })
        )
      })

      // Forward request body
      req.pipe(proxyReq)
    } catch (error) {
      const err = error as Error
      console.error(`✗ Proxy error: ${err.message}`)
      res.writeHead(500)
      res.end(
        JSON.stringify({
          error: 'Internal proxy error',
          message: err.message,
        })
      )
    }
  })

  return server
}

/**
 * Start proxy server and return a promise that resolves when server is listening
 */
export async function startTestProxy(config: TestProxyConfig): Promise<http.Server> {
  const server = createTestProxy(config)

  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.listen(config.port, () => {
      console.log(`\n✓ Test proxy server started`)
      console.log(`  Listening on: http://localhost:${config.port}`)
      console.log(`  Proxying to: ${config.piWebApiUrl}`)
      console.log(`  Auth type: ${config.auth.type}`)
      console.log(`  Username: ${config.auth.domain ? config.auth.domain + '\\' : ''}${config.auth.username}`)
      console.log()
      resolve(server)
    })
  })
}

/**
 * Stop proxy server
 */
export async function stopTestProxy(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err)
      } else {
        console.log('✓ Test proxy server stopped')
        resolve()
      }
    })
  })
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/')) {
  const { loadProxyConfig, validateProxyConfig } = await import('./config.js')

  try {
    const config = loadProxyConfig()
    const validation = validateProxyConfig(config)

    if (!validation.valid) {
      console.error('❌ Invalid proxy configuration:')
      validation.errors.forEach((error) => console.error(`  - ${error}`))
      console.error('\nPlease check your .env.test file')
      process.exit(1)
    }

    const server = await startTestProxy(config)

    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\n\nShutting down...')
      await stopTestProxy(server)
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      await stopTestProxy(server)
      process.exit(0)
    })
  } catch (error) {
    const err = error as Error
    console.error('❌ Failed to start proxy:', err.message)
    process.exit(1)
  }
}
