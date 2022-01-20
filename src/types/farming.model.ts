import { BigNumber } from 'ethers';

export interface StakingRewardsInfo {
    balance: number;
    originalBalance: BigNumber;
}

export interface HugsPoolInfo {
    balance: number;
    allowance: number;
    virtualPrice: number;
    originalBalance: BigNumber;
}

export interface HugsPoolContract {
    balanceOf: (address: string) => BigNumber;
    allowance: (address1: string, address2: string) => BigNumber;
    approve: (spender: string, value: string) => any;
    get_virtual_price: () => BigNumber;
}

export interface StakingRewardsContract {
    balanceOf: (address: string) => BigNumber;
    stake: (amount: BigNumber) => any;
    withdraw: (amount: any) => any;
    getReward: () => any;
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