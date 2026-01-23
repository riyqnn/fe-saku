import { ethers } from 'ethers';

export const SAKU_ABI = [{"inputs":[{"internalType":"address","name":"_idrxAddress","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"phoneHash","type":"bytes32"},{"indexed":false,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"Registered","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"receiverHash","type":"bytes32"},{"indexed":false,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"address","name":"receiver","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Transferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"phoneHash","type":"bytes32"},{"indexed":false,"internalType":"address","name":"oldAccount","type":"address"},{"indexed":false,"internalType":"address","name":"newAccount","type":"address"}],"name":"UpdatedRegistration","type":"event"},{"inputs":[{"internalType":"bytes32","name":"phoneHash","type":"bytes32"}],"name":"getAccount","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"phoneHash","type":"bytes32"}],"name":"getRegistrationTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"idrxToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"phoneHash","type":"bytes32"}],"name":"isRegistered","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"phoneToAccount","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"phoneHash","type":"bytes32"},{"internalType":"address","name":"walletAddress","type":"address"}],"name":"register","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"registrationTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"receiverHash","type":"bytes32"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferIDRX","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferIDRXDirect","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"phoneHash","type":"bytes32"},{"internalType":"address","name":"newAccount","type":"address"}],"name":"updateRegistration","outputs":[],"stateMutability":"nonpayable","type":"function"}];

export const hashPhone = (phone: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  return ethers.keccak256(ethers.toUtf8Bytes(cleanPhone));
};
export const getProvider = () => {
  const url = process.env.NEXT_PUBLIC_RPC_URL;
  if (!url) {
      return new ethers.JsonRpcProvider("https://sepolia.base.org");
  }
  return new ethers.JsonRpcProvider(url);
};
/**
 * Convert token amount to human readable format
 */
export const fromTokenAmount = (amount: bigint, decimals: number = 6): string => {
  return ethers.formatUnits(amount, decimals);
};

/**
 * Convert amount to token decimals
 */
export const toTokenAmount = (amount: string, decimals: number = 6): bigint => {
  return ethers.parseUnits(amount, decimals);
};

/**
 * Check if address is valid Ethereum address
 */
export const isValidAddress = (address: string): boolean => {
  return ethers.isAddress(address);
};

