import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { NetworkID } from "src/lib/Bond";
import { abi as BondCalcContract } from "src/abi/BondCalcContract.json";
import { abi as gOHMBondCalcContract } from "src/abi/gOHMBondCalcContract.json";
import { ethers } from "ethers";
import { FANTOM } from "src/constants";

export function getBondCalculator(networkID: NetworkID, provider: StaticJsonRpcProvider) {
  return new ethers.Contract(FANTOM.BONDINGCALC_ADDRESS, BondCalcContract, provider);
}

export function getBondCalculator1(networkID: NetworkID, provider: StaticJsonRpcProvider) {
  return new ethers.Contract(FANTOM.BONDINGCALC_ADDRESS1, BondCalcContract, provider);
}

export function getgOHMBondCalculator(networkID: NetworkID, provider: StaticJsonRpcProvider) {
  return new ethers.Contract(FANTOM.gOHMBONDINGCALC_ADDRESS, gOHMBondCalcContract, provider);
}
