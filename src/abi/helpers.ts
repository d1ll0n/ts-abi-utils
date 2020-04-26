import { AbiType, AbiJsonDef, AbiStruct } from "./types";

export const bitsRequired = (n: number): number => {
  let a = Math.ceil(Math.log2(n + 1));
  let m = a % 8;
  return (m == 0) ? a : a + 8 - m
}

export const toTypeName = (def: AbiType): string => {
  console.log(def)
  if (def.meta == 'elementary') {
    switch(def.type) {
      case 'uint': return `uint${def.size}`;
      case 'bool': return `bool`;
      case 'byte': return `byte`;
      case 'bytes': return `bytes${def.size / 8}`;
      case 'address': return 'address';
    }
  }
  if (def.meta == 'array') return `${toTypeName(def.baseType)}[${def.length || ''}]`;
  if (def.meta == 'struct') return `tuple`;
  if (def.meta == 'enum') return `uint${def.size}`;
}

export const abiTypeToJson = (abi: AbiType): AbiJsonDef => {
  const typeName = toTypeName(abi);
  switch(abi.meta) {
    case 'elementary': return { type: typeName };
    case 'enum': return { type: typeName };
    case 'array': return { ...abiTypeToJson(abi.baseType), type: typeName };
    case 'struct':
      const components = abi.fields.map(f => ({ ...abiTypeToJson(f.type), name: f.name }));
      return { type: typeName, name: abi.name, components };
  }
}

/**
 * If a struct has an array field, it will only be unpackable if the array
 * has a static size or comes at the end of the struct definition.
 * @param struct Struct definition.
 */
export const isStructAllowed = (struct: AbiStruct): boolean => {
  let len = struct.fields.length;
  // return struct.fields.filter((field, i) => field.type.dynamic && i != len - 1).length > 0
  for (let i = 0; i < len; i++) {
    const field = struct.fields[i];
    if (field.type.dynamic) {
      /* If field is dynamic and not at the end of the struct, it is not allowed. */
      if (i != len - 1) return false;
      /* If field is at the end of the struct but is composed of unacceptable child fields, it is not allowed. */
      if (field.type.meta == 'array' && field.type.baseType.dynamic) return false;
      if (field.type.meta == 'struct' && !isStructAllowed(field.type)) return false;
    }
  }
  return true;
}