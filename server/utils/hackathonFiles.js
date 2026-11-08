// File uploads for hackathon submissions: pitch deck, prototype build and
// screenshots. Files go to ImageKit under a random name; the real contents are
// checked (not just the declared type) before anything is stored.
const crypto = require('crypto');
const multer = require('multer');
const { toFile } = require('@imagekit/nodejs');
const imagekit = require('../config/imagekit');
const { deleteImages } = require('./forumMedia');

const MB = 1024 * 1024;

// What each kind of upload accepts.
const KINDS = {
  deck: { label: 'Pitch deck', maxBytes: 20 * MB, types: ['pdf', 'pptx', 'ppt'] },
  prototype: { label: 'Prototype', maxBytes: 25 * MB, types: ['zip', 'apk', 'pdf', 'pptx', 'png', 'jpg', 'webp'] },
  screenshot: { label: 'Screenshot', maxBytes: 5 * MB, types: ['png', 'jpg', 'webp'] },
};
const MAX_SCREENSHOTS = 5;

const MIME = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  zip: 'application/zip',
  apk: 'application/vnd.android.package-archive',
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * MB, files: 1 } });

// Work out the real file type from its first bytes (and, for ZIP-based
// formats, the extension: .pptx and .apk are ZIP files inside).
function detectType(buffer, originalName = '') {
  const ext = (originalName.split('.').pop() || '').toLowerCase();
  const head = buffer.slice(0, 8);
  if (head.slice(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpg';
  if (head.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (head.slice(0, 4).toString('latin1') === 'RIFF' && buffer.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (head.equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) return ext === 'ppt' ? 'ppt' : null;
  if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) {
    if (ext === 'pptx') return buffer.includes('ppt/') ? 'pptx' : null;
    if (ext === 'apk') return 'apk';
    return 'zip';
  }
  return null;
}

const describe = (types) => types
  .map((t) => t.toUpperCase())
  .join(', ');

// Express middleware: parse one "file" field and check it against the kind.
function receive(req, res, next) {
  const kind = KINDS[req.params.kind];
  if (!kind) return res.status(404).json({ message: 'Unknown upload type.' });
  return upload.single('file')(req, res, (error) => {
    if (error) {
      const tooBig = error.code === 'LIMIT_FILE_SIZE';
      return res.status(400).json({ message: tooBig ? `${kind.label} must be ${kind.maxBytes / MB} MB or smaller.` : error.message });
    }
    if (!req.file) return res.status(400).json({ message: 'Choose a file to upload.' });
    if (req.file.size > kind.maxBytes) return res.status(400).json({ message: `${kind.label} must be ${kind.maxBytes / MB} MB or smaller.` });
    const type = detectType(req.file.buffer, req.file.originalname);
    if (!type || !kind.types.includes(type)) {
      return res.status(400).json({ message: `${kind.label}: upload a ${describe(kind.types)} file.` });
    }
    req.fileType = type;
    return next();
  });
}

async function store(file, type, folder) {
  const fileName = `${crypto.randomUUID()}.${type}`;
  const uploaded = await imagekit.files.upload({
    file: await toFile(file.buffer, fileName),
    fileName,
    folder,
    useUniqueFileName: false,
  });
  return {
    url: uploaded.url,
    fileId: uploaded.fileId,
    name: String(file.originalname || fileName).replace(/[^\w .()-]/g, '_').slice(0, 140),
    size: file.size,
    type: MIME[type] || type,
    uploadedAt: new Date(),
  };
}

// Every stored file of a submission (for clean-up).
const filesOf = (s) => [s?.deckFile, s?.prototypeFile, ...(s?.screenshots || [])].filter((f) => f?.fileId);

const removeFiles = (files) => (files.length ? deleteImages(files.map((f) => ({ fileId: f.fileId }))).catch(() => {}) : Promise.resolve());

module.exports = { KINDS, MAX_SCREENSHOTS, receive, store, filesOf, removeFiles };
