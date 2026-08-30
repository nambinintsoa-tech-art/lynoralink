// Quick diagnostic script to test Cloudinary credentials from .env.local
const fs = require('fs');
const path = require('path');
const https = require('https');
const { v2: cloudinary } = require('cloudinary');

const envPath = path.join(process.cwd(), '.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
const get = (key) => {
  const m = envText.match(new RegExp('^' + key + '=(.*)$', 'm'));
  return m ? m[1].replace(/^["']|["']$/g, '') : null;
};

const cloud_name = get('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
const api_key = get('CLOUDINARY_API_KEY');
const api_secret = get('CLOUDINARY_API_SECRET');
const preset = get('NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET') || null;

console.log('Checking env presence:', {
  cloud_name: !!cloud_name,
  api_key: !!api_key,
  api_secret: !!api_secret,
  preset,
});

if (!cloud_name || !api_key || !api_secret) {
  console.error('Missing required Cloudinary env vars');
  process.exit(1);
}

cloudinary.config({
  cloud_name,
  api_key,
  api_secret,
});

function request(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  try {
    const pingUrl = new URL(`https://api.cloudinary.com/v1_1/${cloud_name}/ping`);
    const ping = await request({
      hostname: pingUrl.hostname,
      path: pingUrl.pathname + pingUrl.search,
      method: 'GET',
      headers: {
        Authorization: 'Basic ' + Buffer.from(api_key + ':' + api_secret).toString('base64'),
      },
    });
    console.log('Ping status:', ping.status);
    console.log('Ping body:', ping.body);

    const tests = [
      { label: 'without preset/folder', options: {} },
      { label: 'with folder only', options: { folder: 'lynoralink_test' } },
      { label: 'with preset only', options: { upload_preset: preset } },
      { label: 'with preset + folder', options: { folder: 'lynoralink_test', upload_preset: preset } },
    ];

    const accountUrl = new URL(`https://api.cloudinary.com/v1_1/${cloud_name}/usage`);
    const account = await request({
      hostname: accountUrl.hostname,
      path: accountUrl.pathname + accountUrl.search,
      method: 'GET',
      headers: {
        Authorization: 'Basic ' + Buffer.from(api_key + ':' + api_secret).toString('base64'),
      },
    });
    console.log('Usage status:', account.status);
    console.log('Usage body:', account.body);

    const crypto = require('crypto');

    const testCases = [
      { label: 'signed_no_preset', options: { folder: 'lynoralink_test' } },
      { label: 'unsigned_preset', options: { upload_preset: preset } },
      { label: 'signed_with_preset', options: { folder: 'lynoralink_test', upload_preset: preset } },
    ];

    for (const test of testCases) {
      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const params = new URLSearchParams();
        params.set('file', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=');
        params.set('api_key', api_key);
        params.set('timestamp', String(timestamp));
        if (test.options.folder) params.set('folder', test.options.folder);
        if (test.options.upload_preset) params.set('upload_preset', test.options.upload_preset);

        const signature = crypto.createHash('sha1').update(params.toString() + api_secret).digest('hex');
        params.set('signature', signature);

        const uploadUrl = new URL(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`);
        const upload = await request({
          hostname: uploadUrl.hostname,
          path: uploadUrl.pathname + uploadUrl.search,
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });

        console.log(`Upload [${test.label}] status:`, upload.status);
        console.log(`Upload [${test.label}] body:`, upload.body);

        if (upload.status === 200) {
          console.log('Upload success:', upload.body.secure_url);
          process.exit(0);
        }
      } catch (err) {
        console.error(`Upload [${test.label}] unexpected error:`, err && err.message);
      }
    }

    const presetsUrl = new URL(`https://api.cloudinary.com/v1_1/${cloud_name}/upload_presets`);
    const presets = await request({
      hostname: presetsUrl.hostname,
      path: presetsUrl.pathname + presetsUrl.search,
      method: 'GET',
      headers: {
        Authorization: 'Basic ' + Buffer.from(api_key + ':' + api_secret).toString('base64'),
      },
    });
    console.log('Presets status:', presets.status);
    console.log('Presets body:', presets.body);

    process.exit(1);
  } catch (err) {
    console.error('Unexpected error:', err && err.message);
    console.error('Full error object:', err);
    process.exit(1);
  }
})();
