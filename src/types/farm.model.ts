import { TransactionResponse } from "@ethersproject/providers";
import { BigNumber } from "ethers";

export interface StakingRewardsInfo {
  balance: BigNumber;
}

export interface TorPoolInfo {
  balance: BigNumber;
  allowance: BigNumber;
  virtualPrice: BigNumber;
}

export interface TorWftmPool {
  balance: BigNumber;
  allowance: BigNumber;
}

export interface TorWftmFarm {
  staked: BigNumber;
  earned: BigNumber;
}

export interface Curve {
  coins: (i: BigNumber) => Promise<string>;
  get_virtual_price: () => Promise<BigNumber>;
}

export interface IERC20 {
  name: () => Promise<string>;
  symbol: () => Promise<string>;
  decimals: () => Promise<number>;
  totalSupply: () => Promise<BigNumber>;
  balanceOf: (owner: string) => Promise<BigNumber>;
  allowance: (owner: string, spender: string) => Promise<BigNumber>;
  approve: (spender: string, value: BigNumber) => Promise<TransactionResponse>;
  transfer: (to: string, value: string) => Promise<TransactionResponse>;
  transferFrom: (from: string, to: string, value: string) => Promise<TransactionResponse>;
}

export interface IStakingRewards {
  balanceOf: (account: string) => Promise<BigNumber>;
  earned: (account: string) => Promise<BigNumber>;
  getRewardForDuration: () => Promise<BigNumber>;
  lastTimeRewardApplicable: () => Promise<BigNumber>;
  rewardPerToken: () => Promise<BigNumber>;
  rewardsDistribution: () => Promise<string>;
  rewardsToken: () => Promise<string>;
  totalSupply: () => Promise<BigNumber>;
  rewardRate: () => Promise<BigNumber>;
  exit: () => Promise<TransactionResponse>;
  getReward: () => Promise<TransactionResponse>;
  stake: (amount: BigNumber) => Promise<TransactionResponse>;
  withdraw: (amount: BigNumber) => Promise<TransactionResponse>;
}

export interface TorBalance {
  balance: BigNumber;
  allowance: BigNumber;
}

export interface WftmBalance {
  balance: BigNumber;
  allowance: BigNumber;
}

export interface StakingInfo {
  _apr: BigNumber;
  _tvl: BigNumber;
  _begin: BigNumber;
  _finish: BigNumber;
  _hugsWithdrawAmount: BigNumber;
  _daiWithdrawAmount: BigNumber;
  _usdcWithdrawAmount: BigNumber;
  _optimalHugsAmount: BigNumber;
  _optimalDaiAmount: BigNumber;
  _optimalUsdcAmount: BigNumber;
  _earnedRewardAmount: BigNumber;
}

export interface MintAllowance {
  usdcAllowance: BigNumber;
  daiAllowance: BigNumber;
  torAllowance: BigNumber;
}

export interface MintInfo {
  isLowerThanReserveCeiling: boolean;
  isCurvePercentageBelowCeiling: boolean;
  mintLimit: BigNumber;
}
export interface RedeemInfo {
  ishigherThanReserveFloor: boolean;
  isCurvePercentageAboveFloor: boolean;
  redeemLimit: BigNumber;
}
export interface CurveAllowance {
  usdcAllowance: BigNumber;
  torAllowance: BigNumber;
  torPoolAllowance: BigNumber;
  daiAllowance: BigNumber;
}

export interface CurveProportions {
  dai: BigNumber;
  usdc: BigNumber;
  tor: BigNumber;
}
