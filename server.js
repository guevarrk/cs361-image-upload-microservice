const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime');

const app = express();
const PORT = process.env.PORT || 4001;

// use http://localhost:3000
app.use(cors({ origin: ['http://localhost:3000'] }));

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
app.post('/media/upload', upload.single('photo'), async (req,res)=>{
  try{
    const itemId = String(req.body.itemId||'').trim();
    const enhance = String(req.body.enhance||'false').toLowerCase()==='true';
    if (!itemId)  return res.status(400).json({ error: 'itemId required' });
    if (!req.file) return res.status(400).json({ error: 'photo file required' });

    const db = loadMeta();
    const count = db.media.filter(m=>m.itemId===itemId).length;
    if (count >= 3) return res.status(400).json({ error: 'Max 3 photos per item' });

    const id  = 'm_'+uuidv4().replace(/-/g,'').slice(0,12);
    const ext = req.file.mimetype==='image/png' ? 'png'
             : req.file.mimetype==='image/webp' ? 'webp' : 'jpg';

    // place img (enhanced) into buffer (enhance optional)
    let img = sharp(req.file.buffer, { failOn: 'none' });
    if (enhance) img = img.normalize().sharpen().modulate({ saturation: 1.05, brightness: 1.02 });

    // original version into the buffer
    const originalBuffer = await img.toFormat(ext, { quality: 90 }).toBuffer();
    await fs.writeFile(path.join(STORAGE.original, `${id}.${ext}`), originalBuffer);

    // medium version (max 1200 on width)
    let medium = sharp(originalBuffer).resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true });
    if (enhance) medium = medium.normalize().sharpen();
    await medium.toFormat(ext, { quality: 85 }).toFile(path.join(STORAGE.medium, `${id}.${ext}`));

    // thumbnail (320 max on width)
    let thumb = sharp(originalBuffer).resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true });
    if (enhance) thumb = thumb.normalize().sharpen();
    await thumb.toFormat(ext, { quality: 80 }).toFile(path.join(STORAGE.thumb, `${id}.${ext}`));

    // metadate
    const meta = await sharp(originalBuffer).metadata();
    const size = originalBuffer.length;
    db.media.push({ id, itemId, ext, created_at: new Date().toISOString(), width: meta.width||null, height: meta.height||null, size });
    saveMeta(db);

    res.json({
      id, itemId, enhanced: enhance,
      urls: {
        original: `/media/${id}`,
        medium:   `/media/${id}?variant=medium`,
        thumb:    `/media/${id}?variant=thumb`
      },
      width: meta.width||null, height: meta.height||null, size
    });
  }catch(err){
    console.error('upload error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.listen(PORT, ()=>console.log(`Media Service running at http://localhost:${PORT}`));
