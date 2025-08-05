import SimpleHeicConverter from '../wasm/heic-to-wrapper.js';

self.onmessage = async function (e) {
  const { file, type, quality } = e.data;
  try {
    let result;
    if (type === 'jpeg') {
      result = await SimpleHeicConverter.convertToJPEG(file, quality || 90);
    } else if (type === 'png') {
      result = await SimpleHeicConverter.convertToPNG(file);
    } else {
      throw new Error('Unsupported conversion type: ' + type);
    }
    self.postMessage({ success: true, result });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};
