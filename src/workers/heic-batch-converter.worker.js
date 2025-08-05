import SimpleHeicConverter from '../wasm/heic-to-wrapper.js';

self.onmessage = async function (e) {
  const { files, type, quality } = e.data;
  const results = [];

  for (let i = 0; i < files.length; i++) {
    try {
      let result;
      if (type === 'jpeg') {
        result = await SimpleHeicConverter.convertToJPEG(
          files[i],
          quality || 90
        );
      } else if (type === 'png') {
        result = await SimpleHeicConverter.convertToPNG(files[i]);
      } else {
        throw new Error('Unsupported conversion type: ' + type);
      }
      results.push({ success: true, result, index: i });
    } catch (error) {
      results.push({ success: false, error: error.message, index: i });
    }

    // Send progress update
    self.postMessage({
      progress: ((i + 1) / files.length) * 100,
      completed: i + 1,
      total: files.length,
    });
  }

  // Send final results
  self.postMessage({ done: true, results });
};
