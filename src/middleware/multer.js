import multer from 'multer';
import fs from 'fs';

export const fileTypes = {
    image: ["image/jpeg", "image/png", "image/gif", "image/jpg", "image/svg+xml", "image/webp", "image/bmp", "image/x-icon", "image/vnd.microsoft.icon"],
    video: ["video/mp4", "video/webm", "video/mpeg", "video/ogg"],
    audio: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3", "audio/x-wav"],
    document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
}


export const multerLocal = (customFiles = [], customPath = "Generals") => {
    const fullPath = `uploads/${customPath}`
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, fullPath);
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + '-' + file.originalname);
        }
    });
    const fileFilter = (req, file, cb) => {
        if (customFiles.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed'), false);
        }
    };
    return multer({ fileFilter: fileFilter, storage: storage });
} 

export const multerOnline = (customFiles = []) => {
    const storage = multer.diskStorage({});
    const fileFilter = (req, file, cb) => {
        if (customFiles.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed'), false);
        }
    };
    return multer({ fileFilter: fileFilter, storage: storage });
} 