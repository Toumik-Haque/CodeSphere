
const multer = require('multer');

const profileUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error('Only JPEG, PNG, and WebP images are allowed.')
      );
    }

    callback(null, true);
  },
});

function handleProfileUpload(req, res, next) {
  profileUpload.single('profileImage')(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message:
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Image must be 5 MB or smaller.'
            : error.message || 'Invalid image.',
      });
    }

    next();
  });
}

module.exports = handleProfileUpload;
