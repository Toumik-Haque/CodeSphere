// Forum image attachments: validation and ImageKit storage.

const crypto = require('crypto');
const multer = require('multer');
const { toFile } = require('@imagekit/nodejs');
const imagekit = require('../config/imagekit');

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, callback) => (TYPES[file.mimetype]
    ? callback(null, true)
    : callback(new Error('Only JPEG, PNG, WebP or GIF images are allowed.'))),
});

function handleImageUpload(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.code === 'LIMIT_FILE_SIZE' ? 'Images must be 2 MB or smaller.' : error.message || 'Invalid image.',
      });
    }
    if (!req.file) return res.status(400).json({ message: 'Choose an image to upload.' });
    return next();
  });
}

// Check the real file contents, not just the declared type.
function sniffType(buffer) {
  const b = buffer;
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 8 && b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length > 6 && ['GIF87a', 'GIF89a'].includes(b.slice(0, 6).toString('ascii'))) return 'image/gif';
  if (b.length > 12 && b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

// Store with a random name in a per-user folder unless a shared folder is requested.
async function storeImage(buffer, userId, area = 'forum', { userScoped = true } = {}) {
  const type = sniffType(buffer);
  if (!type) throw Object.assign(new Error('That file isn\'t a valid image.'), { status: 400 });
  const fileName = `${crypto.randomUUID()}.${TYPES[type]}`;
  const folder = userScoped
    ? `/codesphere/${area}/${userId}`
    : `/codesphere/${area}`;
  const uploaded = await imagekit.files.upload({
    file: await toFile(buffer, fileName),
    fileName,
    folder,
    useUniqueFileName: false,
  });
  return { url: uploaded.url, fileId: uploaded.fileId };
}

async function deleteImages(attachments = []) {
  await Promise.all(attachments.map((a) => (a.fileId
    ? imagekit.files.delete(a.fileId).catch((error) => console.error('Forum image delete error:', error.message))
    : null)));
}

module.exports = { handleImageUpload, storeImage, deleteImages, sniffType, MAX_BYTES };
