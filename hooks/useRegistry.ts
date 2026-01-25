import { useState, useMemo } from 'react'; // Tambahkan useMemo
import { ethers } from 'ethers';
import { SAKU_ABI, getProvider, hashPhone } from '@/lib/blockchain'; 
import { CONTRACTS } from '@/lib/config';

export function useRegistry(signer?: ethers.Signer | null) { 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contract = useMemo(() => {
    const provider = getProvider();
    const registryAddress = CONTRACTS.REGISTRY_ADDRESS;

    if (!registryAddress) {
      console.error("Registry address is missing in config");
      return null;
    }

    return new ethers.Contract(
      registryAddress, 
      SAKU_ABI, 
      signer || provider
    );
  }, [signer]);

  const getActiveContract = () => {
    if (!contract) throw new Error('Contract not initialized');
    return contract;
  };


  const isRegistered = async (phoneNumber: string): Promise<boolean> => {
    try {
      const targetContract = getActiveContract();
      const phoneHash = hashPhone(phoneNumber); 
      return await targetContract.isRegistered(phoneHash);
    } catch (err: any) {
      console.error('Failed to check registration:', err);
      return false; 
    }
  };

  const getAccount = async (phoneNumber: string): Promise<string> => {
    try {
      const targetContract = getActiveContract();
      const phoneHash = hashPhone(phoneNumber);
      return await targetContract.getAccount(phoneHash);
    } catch (err: any) {
      console.error('Failed to get account:', err);
      return ethers.ZeroAddress;
    }
  };

  const getRegistrationTime = async (phoneNumber: string): Promise<bigint> => {
    try {
      if (!contract) throw new Error('Wallet not connected');
      const phoneHash = hashPhone(phoneNumber);
      return await contract.getRegistrationTime(phoneHash);
    } catch (err: any) {
      console.error('Failed to get registration time:', err);
      throw err;
    }
  };

  const getAdminWallet = async (): Promise<string> => {
    try {
      if (!contract) throw new Error('Wallet not connected');
      return await contract.adminWallet();
    } catch (err: any) {
      console.error('Failed to get admin wallet:', err);
      throw err;
    }
  };

  const getPaymentCounter = async (): Promise<bigint> => {
    try {
      if (!contract) throw new Error('Wallet not connected');
      return await contract.paymentCounter();
    } catch (err: any) {
      console.error('Failed to get payment counter:', err);
      throw err;
    }
  };

  const getIdrxTokenAddress = async (): Promise<string> => {
    try {
      if (!contract) throw new Error('Wallet not connected');
      return await contract.idrxToken();
    } catch (err: any) {
      console.error('Failed to get IDRX token address:', err);
      throw err;
    }
  };

  const getQRPayment = async (qrHash: string) => {
    try {
      if (!contract) throw new Error('Wallet not connected');
      const paymentDetails = await contract.getQRPayment(qrHash);
      return {
        merchantHash: paymentDetails.merchantHash,
        payer: paymentDetails.payer,
        amount: paymentDetails.amount,
        timestamp: paymentDetails.timestamp,
        claimed: paymentDetails.claimed,
        exists: paymentDetails.exists,
      };
    } catch (err: any) {
      console.error('Failed to get QR payment:', err);
      throw err;
    }
  };

  const getWithdrawFeeBps = async (): Promise<bigint> => {
    try {
      if (!contract) throw new Error('Wallet not connected');
      return await contract.WITHDRAW_FEE_BPS();
    } catch (err: any) {
      console.error('Failed to get withdraw fee bps:', err);
      throw err;
    }
  };

  const getQRPaymentExpiry = async (): Promise<bigint> => {
    try {
      if (!contract) throw new Error('Wallet not connected');
      return await contract.QR_PAYMENT_EXPIRY();
    } catch (err: any) {
      console.error('Failed to get QR payment expiry:', err);
      throw err;
    }
  };

  const getRegistrationBonus = async (): Promise<bigint> => {
    try {
      if (!contract) throw new Error('Wallet not connected');
      return await contract.REGISTRATION_BONUS();
    } catch (err: any) {
      console.error('Failed to get registration bonus:', err);
      throw err;
    }
  };

  const getContractETHBalance = async (): Promise<bigint> => {
    try {
      if (!contract) throw new Error('Wallet not connected');
      return await contract.getContractETHBalance();
    } catch (err: any) {
      console.error('Failed to get contract ETH balance:', err);
      throw err;
    }
  };

  const getRemainingRegistrations = async (): Promise<bigint> => {
    try {
      if (!contract) throw new Error('Wallet not connected');
      return await contract.getRemainingRegistrations();
    } catch (err: any) {
      console.error('Failed to get remaining registrations:', err);
      throw err;
    }
  };


  const register = async (phoneNumber: string, walletAddress: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!signer) throw new Error('Wallet not connected (Signer missing)');
      const activeContract = getActiveContract();

      const phoneHash = hashPhone(phoneNumber);
      const tx = await activeContract.register(phoneHash, walletAddress);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateRegistration = async (phoneNumber: string, newAddress: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const phoneHash = hashPhone(phoneNumber);
      const tx = await contract.updateRegistration(phoneHash, newAddress);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // WRITE FUNCTIONS - TRANSFER
  // ============================================================

  const transferByPhone = async (receiverPhone: string, amount: bigint) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const receiverHash = hashPhone(receiverPhone);
      const tx = await contract.transferIDRX(receiverHash, amount);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const transferByAddress = async (receiverAddress: string, amount: bigint) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const tx = await contract.transferIDRXDirect(receiverAddress, amount);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const batchTransferByPhone = async (
    receiverPhones: string[],
    amounts: bigint[]
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      if (receiverPhones.length !== amounts.length) {
        throw new Error('Receiver phones and amounts arrays must have the same length');
      }

      if (receiverPhones.length > 100) {
        throw new Error('Cannot transfer to more than 100 recipients at once');
      }

      const receiverHashes = receiverPhones.map((phone) => hashPhone(phone));
      const tx = await contract.batchTransferByPhone(receiverHashes, amounts);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // WRITE FUNCTIONS - TOPUP
  // ============================================================

  const topup = async (phoneNumber: string, amount: bigint) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const phoneHash = hashPhone(phoneNumber);
      const tx = await contract.topup(phoneHash, amount);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const topupTo = async (receiverPhone: string, amount: bigint) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const receiverHash = hashPhone(receiverPhone);
      const tx = await contract.topupTo(receiverHash, amount);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // WRITE FUNCTIONS - WITHDRAW
  // ============================================================

  const withdraw = async (phoneNumber: string, toAddress: string, amount: bigint) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const phoneHash = hashPhone(phoneNumber);
      const tx = await contract.withdraw(phoneHash, toAddress, amount);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const withdrawAll = async (phoneNumber: string, toAddress: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const phoneHash = hashPhone(phoneNumber);
      const tx = await contract.withdrawAll(phoneHash, toAddress);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // WRITE FUNCTIONS - QR PAYMENT
  // ============================================================

  const createQRPayment = async (merchantPhone: string, amount: bigint) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const merchantHash = hashPhone(merchantPhone);
      const tx = await contract.createQRPayment(merchantHash, amount);
      const receipt = await tx.wait();

      // Extract qrHash from the receipt
      let qrHash = '';
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            if (parsed && parsed.name === 'QRPaymentCreated') {
              qrHash = parsed.args.qrHash;
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }

      return { receipt, qrHash };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const claimQRPayment = async (qrHash: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const tx = await contract.claimQRPayment(qrHash);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refundQRPayment = async (qrHash: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const tx = await contract.refundQRPayment(qrHash);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // WRITE FUNCTIONS - ADMIN
  // ============================================================

  const updateAdminWallet = async (newAdminWallet: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const tx = await contract.updateAdminWallet(newAdminWallet);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const emergencyWithdraw = async (amount: bigint) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const tx = await contract.emergencyWithdraw(amount);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const depositETH = async (amount: bigint) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const tx = await contract.depositETH({ value: amount });
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const adminWithdrawETH = async (amount: bigint) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const tx = await contract.adminWithdrawETH(amount);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // View functions
    isRegistered,
    getAccount,
    getRegistrationTime,
    getAdminWallet,
    getPaymentCounter,
    getIdrxTokenAddress,
    getQRPayment,
    getWithdrawFeeBps,
    getQRPaymentExpiry,
    getRegistrationBonus,
    getContractETHBalance,
    getRemainingRegistrations,

    // Registry functions
    register,
    updateRegistration,

    // Transfer functions
    transferByPhone,
    transferByAddress,
    batchTransferByPhone,

    // Topup functions
    topup,
    topupTo,

    // Withdraw functions
    withdraw,
    withdrawAll,

    // QR Pay functions
    createQRPayment,
    claimQRPayment,
    refundQRPayment,

    // Admin functions
    updateAdminWallet,
    emergencyWithdraw,
    depositETH,
    adminWithdrawETH,

    isLoading,
    error,
  };
}
