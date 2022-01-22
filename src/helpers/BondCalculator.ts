import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { NetworkID } from "src/lib/Bond";
import { abi as BondCalcContract } from "src/abi/BondCalcContract.json";
import { abi as gOHMBondCalcContract } from "src/abi/gOHMBondCalcContract.json";
import { ethers } from "ethers";
import { NETWORKS } from "src/constants";

export function getBondCalculator(networkID: NetworkID, provider: StaticJsonRpcProvider) {
  return new ethers.Contract(NETWORKS.get(networkID).BONDINGCALC_ADDRESS, BondCalcContract, provider);
}

export function getBondCalculator1(networkID: NetworkID, provider: StaticJsonRpcProvider) {
  return new ethers.Contract(NETWORKS.get(networkID).BONDINGCALC_ADDRESS1, BondCalcContract, provider);
}

export function getgOHMBondCalculator(networkID: NetworkID, provider: StaticJsonRpcProvider) {
  return new ethers.Contract(NETWORKS.get(networkID).gOHMBONDINGCALC_ADDRESS, gOHMBondCalcContract, provider);
}
