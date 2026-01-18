import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const envLocalPath = path.join(ROOT_DIR, '.env.local');
const envPath = path.join(ROOT_DIR, '.env');
dotenv.config({ path: fsSync.existsSync(envLocalPath) ? envLocalPath : envPath });

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const JWT_SECRET = process.env.JWT_SECRET || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL || 'https://api.artemox.com';
const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || 'v1';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const DATA_PATH = process.env.DATA_PATH || path.join(ROOT_DIR, 'data', 'menu.json');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(ROOT_DIR, 'uploads');
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 5 * 1024 * 1024;
const AI_COMPAT = (process.env.AI_COMPAT || '').toLowerCase();

const normalizeBaseUrl = (baseUrl) => baseUrl.replace(/\/+$/, '');
const buildOpenAiBaseUrl = (baseUrl) => {
  const normalized = normalizeBaseUrl(baseUrl);
  return normalized.endsWith('/v1') ? normalized : `${normalized}/v1`;
};

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || buildOpenAiBaseUrl(GEMINI_API_BASE_URL);
const USE_OPENAI_COMPAT =
  AI_COMPAT === 'openai' || normalizeBaseUrl(GEMINI_API_BASE_URL).includes('api.artemox.com');

const aiClient = GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
      httpOptions: {
        baseUrl: GEMINI_API_BASE_URL,
        apiVersion: GEMINI_API_VERSION,
      },
    })
  : null;

const maskKey = (key) => {
  if (!key) return '';
  const visible = key.length <= 8 ? 2 : 4;
  return `${key.slice(0, visible)}...${key.slice(-visible)}`;
};

const truncate = (value, max) => {
  if (!value) return '';
  const text = typeof value === 'string' ? value : String(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
};

const createRequestId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const getErrorInfo = (error) => {
  if (!error || typeof error !== 'object') {
    return { message: String(error) };
  }
  const info = {
    name: error.name,
    message: error.message,
    status: error.status,
    code: error.code,
  };
  if (error.stack) info.stack = error.stack;
  if (error.details) info.details = error.details;
  if (error.responseBody !== undefined) info.responseBody = error.responseBody;
  if (error.url) info.url = error.url;
  if (error.cause) info.cause = error.cause;
  if (error.response && typeof error.response === 'object') {
    info.response = {
      status: error.response.status,
      statusText: error.response.statusText,
    };
  }
  return info;
};

const readJsonBody = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const requestOpenAi = async ({ path, body, requestId, label }) => {
  const url = `${normalizeBaseUrl(OPENAI_BASE_URL)}/${path.replace(/^\/+/, '')}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GEMINI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const responseBody = await readJsonBody(response);
  if (!response.ok) {
    const error = new Error('openai_request_failed');
    error.status = response.status;
    error.responseBody = responseBody;
    error.url = url;
    error.label = label;
    throw error;
  }
  return responseBody;
};

if (!GEMINI_API_KEY) {
  console.warn('AI client disabled: GEMINI_API_KEY is missing.');
} else {
  console.log(
    `AI client configured: baseUrl=${GEMINI_API_BASE_URL} apiVersion=${GEMINI_API_VERSION} apiKey=${maskKey(GEMINI_API_KEY)}`
  );
  if (USE_OPENAI_COMPAT) {
    console.log(`OpenAI-compatible mode enabled: baseUrl=${OPENAI_BASE_URL}`);
  }
}

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '20mb' }));
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d', immutable: true }));

const ensureDataDir = async () => {
  const dir = path.dirname(DATA_PATH);
  await fs.mkdir(dir, { recursive: true });
};

const readMenu = async () => {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
};

const writeMenu = async (data) => {
  await ensureDataDir();
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
};

const ensureUploadsDir = async () => {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
};

const parseDataUrl = (dataUrl) => {
  if (typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64Data: match[2] };
};

const mimeToExtension = (mimeType) => {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return null;
  }
};

const saveImageBuffer = async (buffer, mimeType) => {
  const extension = mimeToExtension(mimeType);
  if (!extension) return null;
  await ensureUploadsDir();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const filepath = path.join(UPLOADS_DIR, filename);
  await fs.writeFile(filepath, buffer);
  return `/uploads/${filename}`;
};

const isMenuShape = (payload) => {
  return (
    payload &&
    Array.isArray(payload.categories) &&
    Array.isArray(payload.dishes) &&
    Array.isArray(payload.promotions)
  );
};

const requireAuth = (req, res, next) => {
  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'server_not_configured' });
  }
  const authHeader = req.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'missing_token' });
  try {
    jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'invalid_token' });
  }
};

app.get('/api/menu', async (req, res) => {
  try {
    const data = await readMenu();
    if (!data) return res.status(204).end();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'read_failed' });
  }
});

app.post('/api/menu', requireAuth, async (req, res) => {
  try {
    const payload = req.body;
    if (!isMenuShape(payload)) {
      return res.status(400).json({ error: 'invalid_payload' });
    }
    const saved = { ...payload, lastUpdated: Date.now() };
    await writeMenu(saved);
    return res.json(saved);
  } catch (error) {
    return res.status(500).json({ error: 'write_failed' });
  }
});

app.post('/api/login', async (req, res) => {
  if (!ADMIN_PASSWORD || !JWT_SECRET) {
    return res.status(500).json({ error: 'server_not_configured' });
  }
  const { password } = req.body || {};
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'invalid_password' });
  }
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
  return res.json({ token });
});

app.post('/api/uploads', requireAuth, async (req, res) => {
  const { dataUrl } = req.body || {};
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return res.status(400).json({ error: 'invalid_data_url' });
  }
  const extension = mimeToExtension(parsed.mimeType);
  if (!extension) {
    return res.status(400).json({ error: 'unsupported_image_type' });
  }
  try {
    const buffer = Buffer.from(parsed.base64Data, 'base64');
    if (!buffer.length) return res.status(400).json({ error: 'empty_image' });
    if (buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ error: 'image_too_large' });
    }
    const imageUrl = await saveImageBuffer(buffer, parsed.mimeType);
    if (!imageUrl) {
      return res.status(400).json({ error: 'unsupported_image_type' });
    }
    return res.json({ imageUrl });
  } catch (error) {
    console.error('Upload failed:', error);
    return res.status(500).json({ error: 'upload_failed' });
  }
});

app.post('/api/ai/image', requireAuth, async (req, res) => {
  const requestId = createRequestId();
  if (!GEMINI_API_KEY) {
    console.warn(`[ai:image:${requestId}] ai_not_configured`);
    return res.status(503).json({ error: 'ai_not_configured' });
  }
  const { name, description } = req.body || {};
  if (!name) {
    console.warn(`[ai:image:${requestId}] missing_name`);
    return res.status(400).json({ error: 'missing_name' });
  }
  try {
    const prompt = `Professional food photography of a dish called "${name}". Description: ${description || ''}. Studio lighting, high quality, appetizing, centered composition, blurred background.`;
    if (USE_OPENAI_COMPAT) {
      console.info(`[ai:image:${requestId}] request`, {
        name,
        descriptionPreview: truncate(description, 200),
        model: 'gemini-2.5-flash-image',
        promptPreview: truncate(prompt, 200),
        method: 'openai.images.generations',
        baseUrl: OPENAI_BASE_URL,
      });
      const response = await requestOpenAi({
        path: 'images/generations',
        label: 'image',
        requestId,
        body: {
          model: 'gemini-2.5-flash-image',
          prompt,
          n: 1,
          response_format: 'b64_json',
        },
      });
      const data = Array.isArray(response?.data) ? response.data : [];
      const first = data[0] || {};
      const b64 =
        first.b64_json || first.b64 || first.base64 || first.image || first.image_base64 || null;
      const url = first.url || null;
      console.info(`[ai:image:${requestId}] response`, {
        dataCount: data.length,
        hasB64: Boolean(b64),
        hasUrl: Boolean(url),
        responseKeys: response ? Object.keys(response) : [],
      });
      if (b64) {
        const buffer = Buffer.from(b64, 'base64');
        if (!buffer.length) {
          console.warn(`[ai:image:${requestId}] empty_image_buffer`);
          return res.status(502).json({ error: 'no_image' });
        }
        if (buffer.length > MAX_UPLOAD_BYTES) {
          console.warn(`[ai:image:${requestId}] ai_image_too_large`);
          return res.status(413).json({ error: 'image_too_large' });
        }
        const imageUrl = await saveImageBuffer(buffer, 'image/png');
        if (imageUrl) {
          return res.json({ imageUrl });
        }
        const fallbackUrl = `data:image/png;base64,${b64}`;
        return res.json({ imageUrl: fallbackUrl });
      }
      if (url) {
        return res.json({ imageUrl: url });
      }
      console.warn(`[ai:image:${requestId}] no_image_in_response`);
      return res.status(502).json({ error: 'no_image' });
    }

    console.info(`[ai:image:${requestId}] request`, {
      name,
      descriptionPreview: truncate(description, 200),
      model: 'gemini-2.5-flash-image',
      promptPreview: truncate(prompt, 200),
      method: 'generateImages',
      baseUrl: GEMINI_API_BASE_URL,
      apiVersion: GEMINI_API_VERSION,
    });
    const response = await aiClient.models.generateImages({
      model: 'gemini-2.5-flash-image',
      prompt,
      config: {
        aspectRatio: '4:3',
      },
    });

    console.info(`[ai:image:${requestId}] response`, {
      imageCount: response.generatedImages?.length || 0,
      firstImageMimeType: response.generatedImages?.[0]?.image?.mimeType,
      firstImageSize: response.generatedImages?.[0]?.image?.imageBytes?.length || 0,
      raiFilteredReason: response.generatedImages?.[0]?.raiFilteredReason,
      usageMetadata: response?.usageMetadata,
    });

    const image = response.generatedImages?.[0]?.image;
    if (image?.imageBytes) {
      const mimeType = image.mimeType || 'image/png';
      const buffer = Buffer.from(image.imageBytes, 'base64');
      if (!buffer.length) {
        console.warn(`[ai:image:${requestId}] empty_image_buffer`);
        return res.status(502).json({ error: 'no_image' });
      }
      if (buffer.length > MAX_UPLOAD_BYTES) {
        console.warn(`[ai:image:${requestId}] ai_image_too_large`);
        return res.status(413).json({ error: 'image_too_large' });
      }
      const imageUrl = await saveImageBuffer(buffer, mimeType);
      if (imageUrl) {
        return res.json({ imageUrl });
      }
      const fallbackUrl = `data:${mimeType};base64,${image.imageBytes}`;
      return res.json({ imageUrl: fallbackUrl });
    }
    console.warn(`[ai:image:${requestId}] no_image_in_response`);
    return res.status(502).json({ error: 'no_image' });
  } catch (error) {
    console.error(`[ai:image:${requestId}] error`, getErrorInfo(error));
    return res.status(500).json({ error: 'ai_failed' });
  }
});

app.post('/api/ai/description', requireAuth, async (req, res) => {
  const requestId = createRequestId();
  if (!GEMINI_API_KEY) {
    console.warn(`[ai:description:${requestId}] ai_not_configured`);
    return res.status(503).json({ error: 'ai_not_configured' });
  }
  const { name, description } = req.body || {};
  if (!name) {
    console.warn(`[ai:description:${requestId}] missing_name`);
    return res.status(400).json({ error: 'missing_name' });
  }
  try {
    const prompt = [
      'Improve the following menu description in Russian.',
      'Keep it concise (max 80 words), appetizing, and neutral in tone.',
      `Dish name: "${name}".`,
      `Current description: "${description || ''}".`,
      'Return only the improved text.',
    ].join(' ');
    if (USE_OPENAI_COMPAT) {
      console.info(`[ai:description:${requestId}] request`, {
        name,
        descriptionPreview: truncate(description, 200),
        model: 'gemini-3-flash-preview',
        promptPreview: truncate(prompt, 200),
        method: 'openai.chat.completions',
        baseUrl: OPENAI_BASE_URL,
      });
      const response = await requestOpenAi({
        path: 'chat/completions',
        label: 'description',
        requestId,
        body: {
          model: 'gemini-3-flash-preview',
          messages: [{ role: 'user', content: prompt }],
        },
      });
      const message =
        response?.choices?.[0]?.message?.content ||
        response?.choices?.[0]?.text ||
        '';
      console.info(`[ai:description:${requestId}] response`, {
        textLength: message.length,
        textPreview: truncate(message, 200),
        usage: response?.usage,
      });
      return res.json({ description: message });
    }

    console.info(`[ai:description:${requestId}] request`, {
      name,
      descriptionPreview: truncate(description, 200),
      model: 'gemini-3-flash-preview',
      promptPreview: truncate(prompt, 200),
      baseUrl: GEMINI_API_BASE_URL,
      apiVersion: GEMINI_API_VERSION,
    });
    const response = await aiClient.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    console.info(`[ai:description:${requestId}] response`, {
      textLength: response.text?.length || 0,
      textPreview: truncate(response.text, 200),
      usageMetadata: response?.usageMetadata,
    });
    return res.json({ description: response.text || '' });
  } catch (error) {
    console.error(`[ai:description:${requestId}] error`, getErrorInfo(error));
    return res.status(500).json({ error: 'ai_failed' });
  }
});

if (fsSync.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
