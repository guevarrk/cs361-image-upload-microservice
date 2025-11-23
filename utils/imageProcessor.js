const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function processImage(filePath, storage) {
  const id = uuidv4();

  const originalPath = path.join(storage.original, id + '.jpg');
  const mediumPath   = path.join(storage.medium, id + '.jpg');
  const thumbPath    = path.join(storage.thumb, id + '.jpg');

  await fs.copy(filePath, originalPath);

  await sharp(filePath).resize(800).jpeg({ quality: 80 }).toFile(mediumPath);
  await sharp(filePath).resize(200).jpeg({ quality: 80 }).toFile(thumbPath);

  return {
    id,
    paths: {
      original: originalPath,
      medium: mediumPath,
      thumb: thumbPath
    }
  };
}

module.exports = processImage;