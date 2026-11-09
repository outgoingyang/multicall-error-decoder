export const ERROR_STRING_PREFIX = '0x08c379a0'; // keccak256("Error(string)") selector
export const PANIC_CODE_PREFIX = '0x4e487b71'; // keccak256("Panic(uint256)") selector

/** Standard panic (assert) codes from Solidity. */
export const panicCodes: Record<number, string> = {
  0x00: 'Generic panic',
  0x01: 'Assert() has failed',
  0x11: 'Arithmetic operation underflowed or overflowed outside of an unchecked block',
  0x12: 'Division or modulo division by zero',
  0x21: 'Tried to convert to an invalid enum value',
  0x22: 'Storage byte array that is incorrectly encoded',
  0x31: 'Method is called on an empty POP array',
  0x32: 'Array index that is out of bounds',
  0x41: 'Allocation of too much memory or creation of an array which is too large',
  0x51: 'Called a zero-initialized variable of an internal function type',
};

export function panicErrorCodeToReason(code: bigint): string | null {
  return panicCodes[Number(code)] ?? null;
}
