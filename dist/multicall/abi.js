export const MULTICALL3_ABI = [
    'function aggregate((address target, bytes callData)[] calls) payable returns (uint256 blockNumber, bytes[] returnData)',
    'function tryAggregate(bool requireSuccess, (address target, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)',
    'function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)',
    'function aggregate3Value((address target, bool allowFailure, uint256 value, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)',
    'function tryBlockAndAggregate(bool requireSuccess, (address target, bytes callData)[] calls) payable returns (uint256 blockNumber, (bool success, bytes returnData)[] returnData)',
    'function getBlockHash(uint256 blockNumber) view returns (bytes32 blockHash)',
    'function getLastBlockHash() view returns (bytes32 blockHash)',
    'function getCurrentBlockCoinbase() view returns (address coinbase)',
    'function getCurrentBlockDifficulty() view returns (uint256 difficulty)',
    'function getCurrentBlockGasLimit() view returns (uint256 gaslimit)',
    'function getCurrentBlockTimestamp() view returns (uint256 timestamp)',
    'function getEthBalance(address addr) view returns (uint256 balance)',
    'function getBasefee() view returns (uint256 basefee)',
    'function getChainId() view returns (uint256 chainid)',
];
/**
 * Multicall3 is deployed at the same deterministic address (CREATE2) on
 * hundreds of chains: https://github.com/mds1/multicall
 */
export const MULTICALL3_CANONICAL = '0xcA11bde05977b3631167028862bE2a173976CA11';
export function multicall3Address(_chainId) {
    // Every known chain ships Multicall3 at the canonical address.
    // Override via the `address` option if you use a custom deployment.
    return MULTICALL3_CANONICAL;
}
//# sourceMappingURL=abi.js.map