import freighter from "@stellar/freighter-api";
const { isConnected, requestAccess, getAddress, getNetworkDetails, signTransaction } = freighter;
import { networkPassphrase } from "./rpc.js";

export class SignatureCancelled extends Error {
  constructor() { super("Signature cancelled"); this.name = "SignatureCancelled"; }
}
export function walletError(error) {
  const message = typeof error === "string" ? error : error?.message || "Freighter request failed.";
  if (error?.code === -4 || /(?:user.*(?:reject|declin|cancel)|(?:reject|declin|cancel).*user)/i.test(message)) {
    return new SignatureCancelled();
  }
  return new Error(message);
}
async function checkNetwork() {
  const result = await getNetworkDetails();
  if (result.error) throw walletError(result.error);
  if (result.networkPassphrase !== networkPassphrase()) throw new Error("Switch Freighter to the configured Stellar network, then reconnect.");
}
export async function connectFreighter() {
  const installed = await isConnected();
  if (!installed.isConnected) throw new Error("Install or unlock Freighter to connect your wallet.");
  const result = await requestAccess();
  if (result.error) throw walletError(result.error);
  if (!result.address) throw new Error("Freighter did not return an account.");
  await checkNetwork();
  return result.address;
}
export async function signWithFreighter(xdr, options) {
  await checkNetwork();
  const current = await getAddress();
  if (current.error) throw walletError(current.error);
  if (current.address !== options.address) throw new Error("Wallet account changed. Reconnect before funding.");
  const result = await signTransaction(xdr, options);
  if (result.error) throw walletError(result.error);
  return result;
}
