// Proxy configuration for Angular dev server (ES Module format)
// This proxies API calls to backend while allowing Angular routing for HTML navigation

export default {
  "/session": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: (req) => {
      // Only proxy API calls (XHR/fetch with JSON accept header)
      // Let Angular handle HTML navigation requests
      if (req.headers.accept && req.headers.accept.includes('html')) {
        console.log('Bypassing proxy for HTML request:', req.url);
        return '/index.html'; // Serve Angular app
      }
    }
  },
  "/event": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug"
  },
  "/config": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: (req) => {
      if (req.headers.accept && req.headers.accept.includes('html')) {
        return '/index.html';
      }
    }
  },
  "/file": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: (req) => {
      if (req.headers.accept && req.headers.accept.includes('html')) {
        return '/index.html';
      }
    }
  },
  "/agent": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: (req) => {
      if (req.headers.accept && req.headers.accept.includes('html')) {
        return '/index.html';
      }
    }
  },
  "/mcp": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: (req) => {
      if (req.headers.accept && req.headers.accept.includes('html')) {
        return '/index.html';
      }
    }
  },
  "/find": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: (req) => {
      if (req.headers.accept && req.headers.accept.includes('html')) {
        return '/index.html';
      }
    }
  },
  "/lsp": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: (req) => {
      if (req.headers.accept && req.headers.accept.includes('html')) {
        return '/index.html';
      }
    }
  },
  "/formatter": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: (req) => {
      if (req.headers.accept && req.headers.accept.includes('html')) {
        return '/index.html';
      }
    }
  },
  "/project": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: (req) => {
      if (req.headers.accept && req.headers.accept.includes('html')) {
        return '/index.html';
      }
    }
  },
  "/auth": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: (req) => {
      if (req.headers.accept && req.headers.accept.includes('html')) {
        return '/index.html';
      }
    }
  }
};
