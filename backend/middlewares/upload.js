import multer from 'multer';

// Use memory storage so we have immediate access to req.file.buffer
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Provides only image files.'), false);
    }
  }
});

export default upload;
