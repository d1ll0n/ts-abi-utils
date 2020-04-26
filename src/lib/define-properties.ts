import {
  encodeABI,
  decodeABI,
  encodeJson,
  decodeJson,
  encodeABIPacked,
  decodeABIPacked,
} from '../abi/coder';
import { AbiType, JsonValue } from '../abi/types';

export function defineProperties(obj: any, abi: AbiType) {
  obj.fromAbi = (input: string | Buffer) => new obj(decodeABI(abi, input));
  obj.fromAbiPacked = (input: string | Buffer) => new obj(decodeABIPacked(abi, input));
  obj.fromJson = (input: JsonValue) => new obj(decodeJson(abi, input));
  obj.prototype.toAbi = function() { return encodeABI(abi, this); }
  obj.prototype.toAbiPacked = function() { return encodeABIPacked(abi, this); }
  obj.prototype.toJson = function() { return encodeJson(abi, this); }
}