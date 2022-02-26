import { EPOCH_INTERVAL, BLOCK_RATE_SECONDS, FANTOM } from "../constants";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import { BigNumber as EthersBigNumber } from "ethers";
import axios from "axios";
import { abi as PairContract } from "../abi/PairContract.json";
import { abi as RedeemHelperAbi } from "../abi/RedeemHelper.json";
import { dailp } from "./all-bonds/dai-bonds";
import { JsonRpcSigner, StaticJsonRpcProvider } from "@ethersproject/providers";
import { IBaseAsyncThunk } from "src/slices/interfaces";

// NOTE (appleseed): this looks like an outdated method... we now have this data in the graph (used elsewhere in the app)
export async function getMarketPrice({ networkID, provider }: IBaseAsyncThunk) {
  const dailp_address = dailp.getAddressForReserve(networkID);
  const pairContract = new ethers.Contract(dailp_address, PairContract, provider);
  const reserves = await pairContract.getReserves();
  const marketPrice = reserves[1] / reserves[0];

  // commit('set', { marketPrice: marketPrice / Math.pow(10, 9) });
  return marketPrice;
}

export async function getTokenPrice(tokenId = "hector-dao") {
  const resp = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`);
  let tokenPrice: number = resp.data[tokenId].usd;
  return tokenPrice;
}

export function shorten(str: string) {
  if (str.length < 10) return str;
  return `${str.slice(0, 6)}...${str.slice(str.length - 4)}`;
}

export function formatCurrency(c: number, precision = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  }).format(c);
}

export function trim(number = 0, precision = 0) {
  // why would number ever be undefined??? what are we trimming?
  const array = number.toString().split(".");
  if (array.length === 1) return number.toString();
  if (precision === 0) return array[0].toString();

  const poppedNumber = array.pop() || "0";
  array.push(poppedNumber.substring(0, precision));
  const trimmedNumber = array.join(".");
  return trimmedNumber;
}

export function trimDecimalsPast(max: number, float: string): string {
  const decimal = float.indexOf(".");
  if (decimal === -1) {
    return float;
  }
  return float.slice(0, decimal + 1 + max);
}

export function decimalsFromDenomination(denom: Denomination): number {
  switch (denom) {
    case "wei":
      return 0;
    case "kwei":
      return 3;
    case "mwei":
      return 6;
    case "gwei":
      return 9;
    case "szabo":
      return 12;
    case "finney":
      return 15;
    case "ether":
      return 18;
  }
}

export type Denomination = "wei" | "kwei" | "mwei" | "gwei" | "szabo" | "finney" | "ether";
export function prettyEthersNumber(number: EthersBigNumber, denomination: Denomination = "ether"): string {
  return prettyDisplayNumber(new BigNumber(ethers.utils.formatUnits(number, denomination)));
}

export function prettyDisplayNumber(number: BigNumber): string {
  if (number.gt(1)) {
    return trimDecimalsPast(2, number.toFormat());
  } else {
    return trimVerboseDecimals(number.toFormat());
  }
}

export function prettyInputNumber(number: BigNumber): string {
  if (number.gte(1000)) {
    return number.toFixed(0);
  } else if (number.gt(1)) {
    return number.toFixed(2);
  } else {
    return trimVerboseDecimals(number.toString());
  }
}

function trimVerboseDecimals(number: string): string {
  const decimalIndex = number.indexOf(".");
  if (decimalIndex === -1) {
    return number;
  }

  let zeroDecimals = 0;
  for (let i = decimalIndex + 1; i < number.length; i += 1) {
    if (number[i] === "0") {
      zeroDecimals += 1;
    } else {
      break;
    }
  }
  const MEANINGFUL_DECIMAL_PLACES = 2;
  return number.substring(0, decimalIndex + zeroDecimals + 1 + MEANINGFUL_DECIMAL_PLACES);
}

export function getRebaseBlock(currentBlock: number) {
  return currentBlock + EPOCH_INTERVAL - (currentBlock % EPOCH_INTERVAL);
}

export function secondsUntilBlock(startBlock: number, endBlock: number) {
  const blocksAway = endBlock - startBlock;
  const secondsAway = blocksAway * BLOCK_RATE_SECONDS;
  return secondsAway;
}

export function prettyVestingPeriod(currentBlock: number, vestingBlock: number) {
  if (vestingBlock === 0) {
    return "";
  }

  const seconds = secondsUntilBlock(currentBlock, vestingBlock);
  if (seconds < 0) {
    return "Fully Vested";
  }
  return prettifySeconds(seconds);
}

export function prettifySeconds(seconds: number, resolution?: string) {
  if (seconds !== 0 && !seconds) {
    return "";
  }

  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (resolution === "day") {
    return d + (d == 1 ? " day" : " days");
  }

  const dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
  const hDisplay = h > 0 ? h + (h == 1 ? " hr, " : " hrs, ") : "";
  const mDisplay = m > 0 ? m + (m == 1 ? " min" : " mins") : "";

  let result = dDisplay + hDisplay + mDisplay;
  if (mDisplay === "") {
    result = result.slice(0, result.length - 2);
  }

  return result;
}

// TS-REFACTOR-NOTE - Used for:
// AccountSlice.ts, AppSlice.ts, LusdSlice.ts
export function setAll(state: any, properties: any) {
  if (properties) {
    const props = Object.keys(properties);
    props.forEach(key => {
      state[key] = properties[key];
    });
  }
}

export function contractForRedeemHelper({
  networkID,
  provider,
}: {
  networkID: number;
  provider: StaticJsonRpcProvider | JsonRpcSigner;
}) {
  return new ethers.Contract(FANTOM.REDEEM_HELPER_ADDRESS, RedeemHelperAbi, provider);
}

/**
 * returns false if SafetyCheck has fired in this Session. True otherwise
 * @returns boolean
 */
export const shouldTriggerSafetyCheck = () => {
  const _storage = window.sessionStorage;
  const _safetyCheckKey = "-oly-safety";
  // check if sessionStorage item exists for SafetyCheck
  if (!_storage.getItem(_safetyCheckKey)) {
    _storage.setItem(_safetyCheckKey, "true");
    return true;
  }
  return false;
};

/**
 * returns unix timestamp for x minutes ago
 * @param x minutes as a number
 */
export const minutesAgo = (x: number) => {
  const now = new Date().getTime();
  return new Date(now - x * 60000).getTime();
};

/**
 * subtracts two dates for use in 33-together timer
 * param (Date) dateA is the ending date object
 * param (Date) dateB is the current date object
 * returns days, hours, minutes, seconds
 * NOTE: this func previously used parseInt() to convert to whole numbers, however, typescript doesn't like
 * ... using parseInt on number params. It only allows parseInt on string params. So we converted usage to
 * ... Math.trunc which accomplishes the same result as parseInt.
 */
export const subtractDates = (dateA: Date, dateB: Date) => {
  let msA: number = dateA.getTime();
  let msB: number = dateB.getTime();

  let diff: number = msA - msB;

  let days: number = 0;
  if (diff >= 86400000) {
    days = Math.trunc(diff / 86400000);
    diff -= days * 86400000;
  }

  let hours: number = 0;
  if (days || diff >= 3600000) {
    hours = Math.trunc(diff / 3600000);
    diff -= hours * 3600000;
  }

  let minutes: number = 0;
  if (hours || diff >= 60000) {
    minutes = Math.trunc(diff / 60000);
    diff -= minutes * 60000;
  }

  let seconds: number = 0;
  if (minutes || diff >= 1000) {
    seconds = Math.trunc(diff / 1000);
  }
  return {
    days,
    hours,
    minutes,
    seconds,
  };
};
