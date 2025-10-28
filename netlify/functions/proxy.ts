
import { Buffer } from "buffer";
import { Handler, HandlerEvent } from "@netlify/functions";
import fetch, { Headers, RequestInit, Response } from "node-fetch";

// Helper to set common CORS headers on a response
const applyCorsHeaders = (headers: { [header: string]: string | number | string[]; }) => {
  headers["Access-Control-Allow-Origin"] = "*";
  headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
  headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
};

const handler: Handler = async (event: HandlerEvent) => {
  // Immediately handle OPTIONS preflight requests
  if (event.httpMethod === "OPTIONS") {
    const headers = {};
    applyCorsHeaders(headers);
    return {
      statusCode: 204, // No Content
      headers,
      body: "",
    };
  }

  const targetUrl = event.queryStringParameters?.target;

  if (!targetUrl) {
    const headers = { 'Content-Type': 'application/json' };
    applyCorsHeaders(headers);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Target URL is required. Use `/?target=YOUR_URL`." }),
      headers,
    };
  }

  let fullUrl: string;
  try {
    fullUrl = targetUrl.startsWith("http://") || targetUrl.startsWith("https://")
      ? targetUrl
      : `https://${targetUrl}`;
    new URL(fullUrl);
  } catch (_) {
    const headers = { 'Content-Type': 'application/json' };
    applyCorsHeaders(headers);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid target URL provided." }),
      headers,
    };
  }

  try {
    const requestHeaders = new Headers();
    // Forward relevant headers from the original request
    if (event.headers['content-type']) {
        requestHeaders.set('content-type', event.headers['content-type']);
    }
    if (event.headers['authorization']) {
        requestHeaders.set('authorization', event.headers['authorization']);
    }
     if (event.headers['accept']) {
        requestHeaders.set('accept', event.headers['accept']);
    }

    const requestOptions: RequestInit = {
      method: event.httpMethod,
      headers: requestHeaders,
      redirect: 'follow',
    };

    // Forward the body if present
    if (event.body && ['POST', 'PUT', 'PATCH'].includes(event.httpMethod)) {
        // FIX: The `Buffer` object is used here but was not defined, causing a TypeScript error.
        requestOptions.body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
    }
    
    const response: Response = await fetch(fullUrl, requestOptions);
    const data = await response.buffer(); // Use buffer for binary data compatibility

    const responseHeaders: { [key: string]: string } = {};
    applyCorsHeaders(responseHeaders);
    
    // Forward important headers from the target response
    if (response.headers.get("content-type")) {
      responseHeaders["Content-Type"] = response.headers.get("content-type")!;
    }
    if (response.headers.get("content-disposition")) {
        responseHeaders["Content-Disposition"] = response.headers.get("content-disposition")!;
    }

    return {
      statusCode: response.status,
      body: data.toString("base64"),
      isBase64Encoded: true,
      headers: responseHeaders,
    };

  } catch (error: any) {
    console.error("Proxy error:", error);
    const headers = { 'Content-Type': 'application/json' };
    applyCorsHeaders(headers);
    return {
      statusCode: 502, // Bad Gateway
      body: JSON.stringify({ error: "Proxy failed to fetch the target URL.", details: error.message }),
      headers,
    };
  }
};

export { handler };
