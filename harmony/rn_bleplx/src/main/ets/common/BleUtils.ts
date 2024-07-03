import { ValuesBucket } from '@kit.ArkData';
import { ble } from '@kit.ConnectivityKit';

// 字符串转ArrayBuffer
export function stringToArrayBuffer(string: string): ArrayBuffer {
  var buffer = new ArrayBuffer(string.length);
  var bufferView = new Uint8Array(buffer);

  for (var i = 0; i < string.length; i++) {
    bufferView[i] = string.charCodeAt(i);
  }

  return buffer;
}

// ArrayBuffer转Base64
export function arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
  let base64 = ''
  let encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let bytes = new Uint8Array(arrayBuffer)
  let byteLength = bytes.byteLength
  let byteRemainder = byteLength % 3
  let mainLength = byteLength - byteRemainder
  let a, b, c, d
  let chunk
  // Main loop deals with bytes in chunks of 3
  for (let i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048) >> 12 // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032) >> 6 // 4032     = (2^6 - 1) << 6
    d = chunk & 63 // 63       = 2^6 - 1
    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
  }
  // Deal with the remaining bytes and padding
  if (byteRemainder === 1) {
    chunk = bytes[mainLength]
    a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2
    // Set the 4 least significant bits to zero
    b = (chunk & 3) << 4 // 3   = 2^2 - 1
    base64 += encodings[a] + encodings[b] + '=='
  } else if (byteRemainder === 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]
    a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008) >> 4 // 1008  = (2^6 - 1) << 4
    // Set the 2 least significant bits to zero
    c = (chunk & 15) << 2 // 15    = 2^4 - 1
    base64 += encodings[a] + encodings[b] + encodings[c] + '='
  }
  return base64
}

export function scanResultToJsObjectConverter(scanResult: ble.ScanResult): ValuesBucket {
  return {
    id: scanResult.deviceId,
    name: scanResult.deviceName,
    rssi: scanResult.rssi,
    isConnectable: scanResult.connectable,
    manufacturerData: arrayBufferToBase64(scanResult.data),
    localName: '',
    rawScanRecord: '',
    mtu: 0
  }
}
