const ABI = require('web3-eth-abi');
import { toBuf, toHex, toInt, toBn, toBool, BoolLike, toBuffer } from "../lib/to";
import { BufferLike, AbiType, AbiElementaryType, JsonValue, FieldValue } from "./types";
import { abiTypeToJson, isStructAllowed } from './helpers';

export const encodeABI = (abi: AbiType, values: FieldValue): Buffer =>
  toBuffer(ABI.encodeParameter(abiTypeToJson(abi), values));

export const decodeABI = (abi: AbiType, input: string | Buffer): FieldValue =>
  decodeJson(abi, ABI.decodeParameter(abiTypeToJson(abi), toHex(input)));

export const encodeJson = (abi: AbiType, value: FieldValue): JsonValue => {
  switch(abi.meta) {
    case 'elementary':
      if (abi.type == 'bool') return Boolean(value);
      if (abi.type == 'uint' && abi.size < 53) return toInt(<BufferLike> value);
      return toHex(<BufferLike> value);
    case 'array':
      if (!Array.isArray(value)) throw new Error(`Expected ${value} to be an array.`);
      return value.map((v) => encodeJson(abi.baseType, v));
    case 'enum':
      return toInt(<BufferLike> value);
    case 'struct':
      return abi.fields.reduce((obj, field) => ({
        ...obj,
        [field.name]: encodeJson(field.type, value[field.name])
      }), {});
  }
}

export const decodeElementary = (abi: AbiElementaryType, value: FieldValue): FieldValue => {
  switch(abi.type) {
    case 'uint': return ((abi.size < 53) ? toInt : toBn)(<BufferLike> value);
    case 'bool': return toBool(<BoolLike> value);
    default: return toHex(<BufferLike> value);
  }
}

export const decodeJson = (abi: AbiType, json: JsonValue): FieldValue => {
  return decodeObject(abi, json);
}

export const encodeABIPacked = (abi: AbiType, value: FieldValue): Buffer => {
  switch(abi.meta) {
    case 'elementary':
      switch(abi.type) {
        case 'address': return toBuf(<BufferLike> value, 20);
        case 'bool': return toBuf(Boolean(value) ? 1 : 0, 1);
        case 'uint': return toBuf(<BufferLike> value, Math.ceil((abi.size || 256) / 8));
        case 'byte': return toBuf(<BufferLike> value, 1);
        case 'bytes': return toBuf(<BufferLike> value, abi.size ? abi.size / 8 : undefined);
      }
    case 'enum':
      return toBuf(<BufferLike> value, abi.size / 8);
    case 'array':
      if (!Array.isArray(value)) throw new Error(`Expected ${value} to be an array.`);
      return Buffer.concat(value.map(v => encodeABIPacked(abi.baseType, v)));
    case 'struct':
      return Buffer.concat(abi.fields.map(({ type, name }) => encodeABIPacked(type, value[name])));
  }
}

export const decodeABIPacked = (abi: AbiType, input: BufferLike): FieldValue => {
  const value = toBuf(input);
  if (abi.size && (value.length != abi.size / 8)) {
    throw new Error(`Expected buffer with length ${value.length} to have ${abi.size/8} bytes.`)
  }
  let index = 0;
  switch(abi.meta) {
    case 'elementary':
      return decodeElementary(abi, value);
    case 'enum':
      return toInt(value);
    case 'array':
      let arr = [];
      let len = abi.length || value.length / (abi.baseType.size / 8);
      let size = (abi.baseType.size / 8) || value.length / abi.length;
      for (let i = 0; i < len; i++) {
        let buf = Buffer.alloc(size, undefined, 'hex');
        value.copy(buf, 0, index, index + size);
        index += size;
        arr.push(decodeABIPacked(abi.baseType, buf));
      }
      return arr;
    case 'struct':
      if (!isStructAllowed(abi)) throw new Error(`Structs with more than one dynamic field can not be decoded from packed ABI.`);
      let obj = {};
      let sliceBuf = (size?: number): Buffer => {
        size = size ? size / 8 : value.length - index;
        let buf = Buffer.alloc(size, undefined, 'hex');
        value.copy(buf, 0, index, index + size);
        index += size;
        return buf;
      }
      for (let field of abi.fields) {
        let buf = sliceBuf(field.type.size);
        obj[field.name] = decodeABIPacked(field.type, buf);
      }
      return obj;
  }
}

export const decodeObject = (abi: AbiType, input: FieldValue): FieldValue => {
  switch(abi.meta) {
    case 'elementary':
      return decodeElementary(abi, input);
    case 'enum':
      return toInt(<BufferLike> input);
    case 'array':
      if (!Array.isArray(input)) throw new Error(`Expected ${input} to be an array.`);
      return input.map(v => decodeObject(abi.baseType, v));
    case 'struct':
      const reducer = (obj, field, i) => Array.isArray(input)
        ?  ({ ...obj, [field.name]: decodeObject(field.type, input[i]) })
        : ({ ...obj, [field.name]: decodeObject(field.type, input[field.name]) })
      
      return abi.fields.reduce(reducer, {});
  }
}