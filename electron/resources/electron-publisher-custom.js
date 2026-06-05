/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const electronPublish = require('electron-publish');

class Publisher extends electronPublish.Publisher {
  async upload(task) {
    throw new Error(`Custom publisher upload is not implemented for ${task.file}`);
  }
}
module.exports = Publisher;
