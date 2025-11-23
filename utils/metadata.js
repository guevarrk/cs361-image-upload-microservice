const fs = require('fs-extra');

async function storeMetadata(metaPath, item) {
  let data = [];

  if (await fs.pathExists(metaPath)) {
    data = await fs.readJson(metaPath);
  }

  data.push(item);

  await fs.writeJson(metaPath, data, { spaces: 2 });
}

module.exports = storeMetadata;
