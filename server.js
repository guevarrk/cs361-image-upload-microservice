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

const processImage = require('./utils/imageProcessor');
const storeMetadata = require('./utils/metadata');

const app = express();
//app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// to allow proxy requests
app.use(cors({
  origin: true,
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


app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await processImage(
      req.file.path,
      STORAGE
    );

    const entry = {
      id: result.id,
      itemid: req.body.itemid || null,
      timestamp: new Date().toISOString()
    };

    await storeMetadata(META_PATH, entry);

    res.json({
      message: 'Upload successful',
      id: result.id,
      variants: {
        original: `/media/${result.id}?variant=original`,
        medium: `/media/${result.id}?variant=medium`,
        thumb: `/media/${result.id}?variant=thumb`
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.listen(PORT, ()=>console.log(`Media Service running at http://localhost:${PORT}`));
