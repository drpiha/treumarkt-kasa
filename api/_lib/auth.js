// Paylaşılan şifre doğrulama — Authorization: Bearer <password>
// APP_PASSWORD env var tanımlı değilse her isteğe izin verir (dev/test modu).
export function requireAuth(req, res) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return true;
  const got = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (got !== expected) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

// JSON body parse + method whitelist yardımcı
export async function readJSON(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return await new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
