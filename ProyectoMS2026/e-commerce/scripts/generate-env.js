/**
 * Genera environment.prod.ts en tiempo de build usando API_URL (Vercel/CI).
 * Uso local: API_URL=https://tu-gateway.com npm run build
 */
const fs = require('fs');
const path = require('path');

const apiUrl = (process.env.API_URL ?? '').trim().replace(/\/$/, '');
const target = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');

const content = `export const environment = {
  production: true,
  apiUrl: '${apiUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',
};
`;

fs.writeFileSync(target, content, 'utf8');
console.log(`[generate-env] environment.prod.ts -> apiUrl="${apiUrl || '(vacío — solo UI estática)'}"`);
