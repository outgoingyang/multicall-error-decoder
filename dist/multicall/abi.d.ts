export declare const MULTICALL3_ABI: string[];
/**
 * Multicall3 is deployed at the same deterministic address (CREATE2) on
 * hundreds of chains: https://github.com/mds1/multicall
 */
export declare const MULTICALL3_CANONICAL = "0xcA11bde05977b3631167028862bE2a173976CA11";
export declare function multicall3Address(_chainId?: number | bigint): string;
