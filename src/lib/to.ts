import BN from 'bn.js'
import { toBuffer, setLength, bufferToHex, bufferToInt, unpad } from 'ethereumjs-util';

type BufferLike = string | number | Buffer | BN;
export type TypeMap<T> = { [key: string]: T }
export type BufferLikeMap = TypeMap<BufferLike>
export type BufferMap = TypeMap<Buffer>
export type BoolLike = string | Buffer | boolean | number;

export const isHex = (str: string): boolean => Boolean(/[xabcdef]/g.exec(str));

export const toBn = (value: BufferLike): BN => {
  if (typeof value == 'number') return new BN(value);
  if (typeof value == 'string') return new BN(value, isHex(value) ? 'hex' : undefined);
  return new BN(value);
}

export const toInt = (value: BufferLike): number => {
  if (typeof value == 'number') return value;
  if (typeof value == 'string') {
    if (isHex(value)) return parseInt(value, 16);
    return +value;
  }
  if (Buffer.isBuffer(value)) return bufferToInt(value);
  if (BN.isBN(value)) return value.toNumber();
  throw new Error('Did not recognize type.');
}

export const toHex = (value: BufferLike): string => {
  if (typeof value == 'number') return value.toString(16);
  if (typeof value == 'string') {
    if (value.slice(0, 2) == '0x') return value;
    return (+value).toString(16);
  }
  if (Buffer.isBuffer(value)) return bufferToHex(value);
  if (BN.isBN(value)) return value.toString('hex');
  throw new Error('Did not recognize type.');
}

export const toBuf = (value: BufferLike, length?: number): Buffer => {
  const buf = toBuffer(value);
  if (length) {
    if (buf.length > length && unpad(buf).length > length) {
      throw new Error(`Input too large. Maximum ${length} bytes, value had ${buf.length} bytes.`)
    }
    return setLength(buf, length);
  }
  return buf;
}

export const toNonPrefixed = (str: string) => {
  if (str.slice(0, 2) == '0x') return str.slice(2);
  return str;
}

export const toBool = (input: BoolLike): boolean => {
  if (typeof input == 'boolean') return input;
  return Boolean(toInt(input))
}

export { toBuffer };