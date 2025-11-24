require('dotenv').config();
const PORT = process.env.PORT || 4001;

const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime');


const app = express();
//app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// to allow proxy requests and dynamic origins
app.use(cors({
  origin: (origin, cb) => cb(null, true),
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: true
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Folders
const DATA_DIR = path.join(__dirname, 'data');
const META_PATH = path.join(DATA_DIR, 'media.json');
const STORAGE = {
  original: path.join(__dirname, 'storage', 'original'),
  medium:   path.join(__dirname, 'storage', 'medium'),
  thumb:    path.join(__dirname, 'storage', 'thumb')
};
fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(STORAGE.original);
fs.ensureDirSync(STORAGE.medium);
fs.ensureDirSync(STORAGE.thumb);

if (!fs.existsSync(META_PATH)) fs.writeJsonSync(META_PATH, { media: [] }, { spaces: 2 });

function loadMeta(){ try { return fs.readJsonSync(META_PATH); } catch { return { media: [] }; } }
function saveMeta(obj){ fs.writeJsonSync(META_PATH, obj, { spaces: 2 }); }

// keep file in memory for multi formats
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB cap
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg','image/png','image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Unsupported file type'), ok);
  }
});

app.get('/health', (_req,res)=>res.json({ ok: true }));

// display all images per item
app.get('/media/by-item/:itemId', (req,res)=>{
  const itemId = String(req.params.itemId||'').trim();
  const media = loadMeta().media.filter(m=>m.itemId===itemId);
  res.json({ itemId, count: media.length, media });
});

// show specific image type
app.get('/media/:id', (req,res)=>{
  const id = String(req.params.id||'');
  const variant = (req.query.variant||'original').toString();
  const folder = variant==='thumb' ? STORAGE.thumb : (variant==='medium' ? STORAGE.medium : STORAGE.original);
  const db = loadMeta();
  const row = db.media.find(m=>m.id===id);
  const ext = row ? (row.ext||'jpg') : 'jpg';
  const fp = path.join(folder, `${id}.${ext}`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  res.type(mime.getType(ext) || 'image/jpeg');
  fs.createReadStream(fp).pipe(res);
});

// delete image - all types
app.delete('/media/:id', async (req,res)=>{
  const id = String(req.params.id||'');
  const db = loadMeta();
  const row = db.media.find(m=>m.id===id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const ext = row.ext || 'jpg';
  for (const k of Object.keys(STORAGE)){
    const p = path.join(STORAGE[k], `${id}.${ext}`);
    if (fs.existsSync(p)) await fs.remove(p);
  }
  saveMeta({ media: db.media.filter(m=>m.id!==id) });
  res.json({ ok: true, id });
});

// enhance option for photo before upload


// Minimal integrated test page
app.get(['/','/test'], (_req, res) => {
  // Default itemId you can change in the form
  res.render('test', { defaultItemId: 'testItem1' });
});


// breaking up the post upload route to individual functions for clarity

function validatePayload(req) {
  const itemId = String(req.body.itemId || '').trim();
  const enhance = String(req.body.enhance || 'false').toLowerCase() === 'true';

  if (!itemId) return { error: 'itemId required' };
  if (!req.file) return { error: 'photo file required' };

  return { itemId, enhance };
}

// 3 photos limit per item
function enforceItemLimit(db, itemId) {
  const count = db.media.filter(m => m.itemId === itemId).length;
  return count >= 3 ? { error: 'Max 3 photos per item' } : null;
}

// id creation and extension
function generateIdAndExt(file) {
  const id = 'm_' + uuidv4().replace(/-/g, '').slice(0, 12);
  const ext =
    file.mimetype === 'image/png'  ? 'png'  :
    file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  return { id, ext };
}

//image buffer
async function createOriginal(file, ext, enhance) {
  let img = sharp(file.buffer, { failOn: 'none' });
  if (enhance) img = img.normalize().sharpen().modulate({ saturation: 1.05, brightness: 1.02 });
  return img.toFormat(ext, { quality: 90 }).toBuffer();
}

//medium version
async function createMedium(buffer, id, ext, enhance) {
  let img = sharp(buffer).resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true });
  if (enhance) img = img.normalize().sharpen();
  return img.toFormat(ext, { quality: 85 }).toFile(path.join(STORAGE.medium, `${id}.${ext}`));
}

//thumbnail creation
async function createThumb(buffer, id, ext, enhance) {
  let img = sharp(buffer).resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true });
  if (enhance) img = img.normalize().sharpen();
  return img.toFormat(ext, { quality: 80 }).toFile(path.join(STORAGE.thumb, `${id}.${ext}`));
}

//metadata entry
async function createMetadata(buffer, id, itemId, ext) {
  const meta = await sharp(buffer).metadata();
  return {
    id,
    itemId,
    ext,
    created_at: new Date().toISOString(),
    width: meta.width || null,
    height: meta.height || null,
    size: buffer.length
  };
}

//post upload route
app.post('/media/upload', upload.single('photo'), async (req, res) => {
  try {
    const { itemId, enhance, error } = validatePayload(req);
    if (error) return res.status(400).json({ error });

    const db = loadMeta();
    const limitErr = enforceItemLimit(db, itemId);
    if (limitErr) return res.status(400).json(limitErr);

    const { id, ext } = generateIdAndExt(req.file);

    const originalBuffer = await createOriginal(req.file, ext, enhance);

    // Save original file to storage/original
    await fs.writeFile(
      path.join(STORAGE.original, `${id}.${ext}`),
      originalBuffer
    );

    await createMedium(originalBuffer, id, ext, enhance);
    await createThumb(originalBuffer, id, ext, enhance);

    const entry = await createMetadata(originalBuffer, id, itemId, ext);
    db.media.push(entry);
    saveMeta(db);

    res.json({
      id, itemId,
      enhanced: enhance,
      urls: {
        original: `/media/${id}`,
        medium: `/media/${id}?variant=medium`,
        thumb: `/media/${id}?variant=thumb`
      },
      width: entry.width,
      height: entry.height,
      size: entry.size
    });

  } catch (err) {
    console.error('upload error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});



app.listen(PORT, ()=>console.log(`Media Service running at http://localhost:${PORT}`));
