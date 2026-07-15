/**
 * Fake camera metadata. A patina'd image should carry a birth certificate
 * that matches its face: an EXIF block with a capture date years in the past
 * and a period-correct camera. Canvas can't write EXIF, so we hand-build a
 * minimal TIFF/EXIF APP1 segment and splice it in right after the JPEG SOI.
 */

import type { RNG } from "./effects/random";

export interface ExifInfo {
  make: string;
  model: string;
  software: string;
  /** "YYYY:MM:DD HH:MM:SS" — the EXIF datetime format. */
  dateTime: string;
}

const asciiBytes = (s: string): Uint8Array => {
  const b = new Uint8Array(s.length + 1); // NUL-terminated per EXIF
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
  return b;
};

/** Build a complete APP1 (0xFFE1 … Exif … TIFF) segment for `info`. */
export function buildExifApp1(info: ExifInfo): Uint8Array {
  const make = asciiBytes(info.make);
  const model = asciiBytes(info.model);
  const software = asciiBytes(info.software);
  const dt = asciiBytes(info.dateTime);

  // Fixed layout (big-endian TIFF): header(8) + IFD0(66) + ExifIFD(42) + pool.
  const IFD0 = 8;
  const EXIF_IFD = 74; // 8 + (2 + 5*12 + 4)
  const POOL = 116; // 74 + (2 + 3*12 + 4)
  const offMake = POOL;
  const offModel = offMake + make.length;
  const offSoftware = offModel + model.length;
  const offDt = offSoftware + software.length;
  const tiffLen = offDt + dt.length;

  const tiff = new Uint8Array(tiffLen);
  const dv = new DataView(tiff.buffer);

  // TIFF header
  dv.setUint16(0, 0x4d4d); // "MM" big-endian
  dv.setUint16(2, 0x002a);
  dv.setUint32(4, IFD0);

  // A single 12-byte IFD entry.
  const entry = (at: number, tag: number, type: number, count: number, value: number) => {
    dv.setUint16(at, tag);
    dv.setUint16(at + 2, type);
    dv.setUint32(at + 4, count);
    dv.setUint32(at + 8, value);
  };

  // IFD0: Make, Model, Software, DateTime, Exif pointer (tags ascending).
  dv.setUint16(IFD0, 5);
  entry(IFD0 + 2, 0x010f, 2, make.length, offMake);
  entry(IFD0 + 14, 0x0110, 2, model.length, offModel);
  entry(IFD0 + 26, 0x0131, 2, software.length, offSoftware);
  entry(IFD0 + 38, 0x0132, 2, dt.length, offDt);
  entry(IFD0 + 50, 0x8769, 4, 1, EXIF_IFD);
  dv.setUint32(IFD0 + 62, 0); // no next IFD

  // Exif sub-IFD: ExifVersion, DateTimeOriginal, DateTimeDigitized.
  dv.setUint16(EXIF_IFD, 3);
  dv.setUint16(EXIF_IFD + 2, 0x9000); // ExifVersion, UNDEFINED[4]
  dv.setUint16(EXIF_IFD + 4, 7);
  dv.setUint32(EXIF_IFD + 6, 4);
  tiff.set([0x30, 0x32, 0x33, 0x30], EXIF_IFD + 10); // "0230", inline
  entry(EXIF_IFD + 14, 0x9003, 2, dt.length, offDt); // DateTimeOriginal
  entry(EXIF_IFD + 26, 0x9004, 2, dt.length, offDt); // DateTimeDigitized
  dv.setUint32(EXIF_IFD + 38, 0);

  // String pool
  tiff.set(make, offMake);
  tiff.set(model, offModel);
  tiff.set(software, offSoftware);
  tiff.set(dt, offDt);

  // Wrap in APP1: FFE1 | length | "Exif\0\0" | tiff
  const header = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
  const segLen = 2 + header.length + tiff.length; // length field counts itself
  const app1 = new Uint8Array(2 + segLen);
  app1[0] = 0xff;
  app1[1] = 0xe1;
  app1[2] = (segLen >> 8) & 0xff;
  app1[3] = segLen & 0xff;
  app1.set(header, 4);
  app1.set(tiff, 4 + header.length);
  return app1;
}

/** Insert an APP1 segment immediately after the SOI of a JPEG blob. */
export async function injectExif(blob: Blob, app1: Uint8Array): Promise<Blob> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return blob; // not a JPEG; leave as-is
  const out = new Uint8Array(buf.length + app1.length);
  out.set(buf.subarray(0, 2), 0); // SOI
  out.set(app1, 2); // our EXIF
  out.set(buf.subarray(2), 2 + app1.length); // the rest
  return new Blob([out], { type: "image/jpeg" });
}

/** Two-digit zero-pad. */
const p2 = (n: number): string => String(n).padStart(2, "0");

/** Format a Date as the EXIF "YYYY:MM:DD HH:MM:SS" string. */
export function formatExifDate(d: Date): string {
  return (
    `${d.getFullYear()}:${p2(d.getMonth() + 1)}:${p2(d.getDate())} ` +
    `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`
  );
}

interface Camera {
  make: string;
  model: string;
  software: string;
}

/** A camera plausibly in a pocket in `year` — the metadata should fit the era. */
export function pickCamera(year: number, rng: RNG): Camera {
  let pool: Camera[];
  if (year <= 2007) {
    pool = [
      { make: "NOKIA", model: "N73", software: "V 3.0638.0.0.1" },
      { make: "Sony Ericsson", model: "K750i", software: "R1CA035" },
      { make: "Canon", model: "Canon PowerShot A540", software: "Firmware 1.00" },
    ];
  } else if (year <= 2011) {
    pool = [
      { make: "Apple", model: "iPhone 4", software: "4.3.2" },
      { make: "Nokia", model: "N95", software: "V 31.0.015" },
      { make: "Canon", model: "Canon IXUS 100 IS", software: "Firmware 1.00" },
      { make: "HTC", model: "HTC Desire", software: "2.29.405.5" },
    ];
  } else if (year <= 2015) {
    pool = [
      { make: "Apple", model: "iPhone 5s", software: "8.1.2" },
      { make: "samsung", model: "GT-I9300", software: "I9300XXUGMK6" },
      { make: "Xiaomi", model: "MI 2S", software: "MIUI" },
    ];
  } else if (year <= 2019) {
    pool = [
      { make: "Apple", model: "iPhone 7", software: "11.2.6" },
      { make: "HUAWEI", model: "EML-AL00", software: "EML-AL00 8.1.0" },
      { make: "Xiaomi", model: "MI 6", software: "MIUI 10" },
    ];
  } else {
    pool = [
      { make: "Apple", model: "iPhone 12", software: "15.1" },
      { make: "HUAWEI", model: "ELS-AN00", software: "Magic UI" },
      { make: "Xiaomi", model: "M2012K11AC", software: "MIUI 12" },
    ];
  }
  return rng.pick(pool);
}
