export const barcodeFormats = ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'];

// Chrome on Android ships BarcodeDetector; iOS Safari and Firefox do not, so fall back to the
// ZXing WebAssembly ponyfill. The .wasm is bundled with the app instead of fetched from a CDN.
export async function createBarcodeDetector() {
  if ('BarcodeDetector' in window) {
    const supported = await window.BarcodeDetector.getSupportedFormats().catch(() => []);
    const formats = barcodeFormats.filter(format => supported.includes(format));
    if (formats.length) return new window.BarcodeDetector({ formats });
  }
  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url')
  ]);
  prepareZXingModule({
    overrides: { locateFile: (path, prefix) => path.endsWith('.wasm') ? wasmUrl : prefix + path },
    fireImmediately: true
  });
  return new BarcodeDetector({ formats: barcodeFormats });
}
