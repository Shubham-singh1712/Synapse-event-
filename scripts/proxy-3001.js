const http = require('http');

const server = http.createServer((req, res) => {
  const headers = { ...req.headers };
  headers['host'] = req.headers.host || 'localhost:3001';
  headers['x-forwarded-host'] = req.headers.host || 'localhost:3001';
  headers['x-forwarded-proto'] = 'http';
  headers['x-forwarded-port'] = '3001';

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: req.url,
    method: req.method,
    headers: headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Waiting for Next.js on port 3000...');
  });

  req.pipe(proxyReq, { end: true });
});

// Support WebSockets (Next.js HMR)
server.on('upgrade', (req, socket, head) => {
  const proxyReq = http.request({
    hostname: 'localhost',
    port: 3000,
    path: req.url,
    method: req.method,
    headers: req.headers,
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    socket.write('HTTP/1.1 101 Switching Protocols\r\n' +
      Object.entries(proxyRes.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n\r\n');
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxyReq.on('error', () => {
    socket.destroy();
  });

  proxyReq.end();
});

server.listen(3001, () => {
  console.log('Port forwarder active: http://localhost:3001 -> http://localhost:3000');
});
