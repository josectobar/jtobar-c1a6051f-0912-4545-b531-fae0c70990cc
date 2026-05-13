const host = process.env['HOST'] ?? 'localhost';
const port = process.env['PORT'] ?? '3000';

global.BASE_URL = `http://${host}:${port}/api`;
