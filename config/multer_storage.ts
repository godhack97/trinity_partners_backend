import * as multer from "multer";
import { transliterator } from "@app/utils/transliterator";
import { clearSpecSymbols } from "@app/utils/clearSpecSymbols";

const filename = (_: any, file: any, cb: any) => {
  const [name, ext] = file.originalname.split('.');
  const str = transliterator(clearSpecSymbols(name)) + '-' +  Date.now() + '.' + ext;
  cb(null, str)
};

const destination = (dest: string) => {
  return (_, __, cb) => {
    cb(null, process.cwd() + dest)
  };
};

const imageStorage = multer.diskStorage({
  destination: destination('/public/images/'),
  filename,
})

const filesStorage = multer.diskStorage({
  destination: destination('/public/files/'),
  filename,
})

export const multerStorage = {
  images: imageStorage,
  files: filesStorage
};