/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// 定义CORS头部，方便复用
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
};

/**
 * 处理 OPTIONS 预检请求
 * @param {Request} request
 * @returns {Response}
 */
function handleOptions(request: Request) {
  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    // 处理预检请求
    return new Response(null, {
      headers: corsHeaders,
    });
  } else {
    // 处理简单的 OPTIONS 请求
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
      },
    });
  }
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('target');

  if (!targetUrl) {
    const errorResponse = { error: 'Target URL is required. Use `/?target=YOUR_URL`.' };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  let validUrl: URL;
  try {
    validUrl = new URL(targetUrl);
  } catch (e) {
    const errorResponse = { error: 'Invalid target URL provided.' };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  // 复制原始请求的头部，并进行一些清理
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('Host', validUrl.host);
  requestHeaders.set('Origin', validUrl.origin);
  requestHeaders.set('Referer', validUrl.href);
  // 移除 Cloudflare 特有的头部
  requestHeaders.delete('cf-connecting-ip');
  requestHeaders.delete('cf-ipcountry');
  requestHeaders.delete('cf-ray');
  requestHeaders.delete('cf-visitor');

  try {
    // 向目标 URL 发起请求
    const response = await fetch(validUrl.toString(), {
      method: request.method,
      headers: requestHeaders,
      body: request.body,
      redirect: 'follow',
    });

    // 创建一个新的响应，并附上 CORS 头部
    const modifiedResponse = new Response(response.body, response);
    
    // 复制目标响应的头部
    for (const [key, value] of response.headers.entries()) {
        modifiedResponse.headers.set(key, value);
    }

    // 添加/覆盖 CORS 头部
    for (const [key, value] of Object.entries(corsHeaders)) {
        modifiedResponse.headers.set(key, value);
    }

    return modifiedResponse;

  } catch (error: any) {
     const errorResponse = { error: 'Proxy failed to fetch the target URL.', details: error.message };
     return new Response(JSON.stringify(errorResponse), {
      status: 502, // Bad Gateway
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}

// FIX: Define ExecutionContext type for Cloudflare Workers to resolve TypeScript error.
interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }
    return handleRequest(request);
  },
};

interface Env {}