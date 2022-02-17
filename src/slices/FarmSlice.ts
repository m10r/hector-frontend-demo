import { JsonRpcProvider } from "@ethersproject/providers";
import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import { BigNumber, ethers } from "ethers";
import { FANTOM, messages } from "src/constants";
import { setAll } from "src/helpers";
import { sleep } from "src/helpers/Sleep";
import { RootState } from "src/store";
import {
  CurveProportions,
  TorPoolContract,
  TorPoolInfo,
  StakingInfo,
  StakingRewardsContract,
  StakingRewardsInfo,
  TorContract,
  TorBalance,
  CurveAllowance,
  MintInfo,
  RedeemInfo,
  MintAllowance
} from "src/types/farm.model";
import { abi as farmingAggregatorAbi } from "../abi/farmingAggregatorContract.json";
import { abi as torPoolAbi } from "../abi/farmingTorPoolContract.json";
import { abi as stakingRewardsAbi } from "../abi/farmingStakingRewardsContract.json";
import { abi as curveFiAbi } from "../abi/CurveFiContract.json";
import { abi as torAbi } from "../abi/bonds/torContract.json";
import { abi as IERC20 } from "../abi/IERC20.json";
import { abi as torMinterAbi } from "../abi/TorMinterContract.json";
import { abi as torRedeemAbi } from "../abi/TorRedeemContract.json";
import { abi as torPoolAmountAbi } from "../abi/TorPoolAmountContract.json";
import { IBaseAddressAsyncThunk, IBaseAsyncThunk, IValueAsyncThunk } from "./interfaces";
import { error, info, success } from "./MessagesSlice";

interface MintThunk extends IValueAsyncThunk {
  mint: 'dai' | 'usdc'
}

interface ICurveTokensThunk extends IBaseAddressAsyncThunk {
  daiAmount?: string;
  usdcAmount?: string;
  torAmount?: string;
  lpBalance?: BigNumber;
  coin?: 0 | 1 | 2;
}

export interface DaiUsdcBalance {
  usdcHexBalance: BigNumber;
  usdcBalance: number;
  daiHexBalance: BigNumber;
  daiBalance: number;
}

export const stakingGateway = (chainID: number, provider: JsonRpcProvider) =>
  new ethers.Contract(FANTOM.FARMING_AGGREGATOR_ADDRESS, farmingAggregatorAbi, provider);

const stakingRewardsContract = (chainID: number, provider: JsonRpcProvider, address: string) =>
  (new ethers.Contract(
    FANTOM.FARMINNG_STAKING_REWARDS_ADDRESS,
    stakingRewardsAbi,
    provider.getSigner(address),
  ) as unknown) as StakingRewardsContract;

const torPoolContract = (chainID: number, provider: JsonRpcProvider, address: string) =>
  (new ethers.Contract(
    FANTOM.TOR_LP_POOL_ADDRESS,
    torPoolAbi,
    provider.getSigner(address),
  ) as unknown) as TorPoolContract;

const torContract = (chainID: number, provider: JsonRpcProvider, address: string) =>
  new ethers.Contract(FANTOM.TOR_ADDRESS, torAbi, provider.getSigner(address)) as unknown as TorContract;

const usdcContract = (chainID: number, provider: JsonRpcProvider, address: string) => new ethers.Contract(FANTOM.USDC_ADDRESS, IERC20, provider.getSigner(address));
const daiContract = (chainID: number, provider: JsonRpcProvider, address: string) => new ethers.Contract(FANTOM.DAI_ADDRESS, IERC20, provider.getSigner(address));

const torMinterContract = (chainID: number, provider: JsonRpcProvider, address: string) =>
  new ethers.Contract(FANTOM.TOR_MINTER_ADDRESS, torMinterAbi, provider.getSigner(address));

const curveFiContract = (chainID: number, provider: JsonRpcProvider, address: string) => new ethers.Contract(FANTOM.CURVE_FI_ADDRESS, curveFiAbi, provider.getSigner(address))

export const getAssetPrice = createAsyncThunk(
  "farm/getAssetPrice",
  async ({ networkID, provider }: IBaseAsyncThunk) =>
    (await stakingGateway(networkID, provider).assetPrice()) as BigNumber,
);

export const getStakingRewardsInfo = createAsyncThunk(
  "farm/getStakingRewardsInfo",
  async ({ networkID, provider, address }: IBaseAddressAsyncThunk) => {
    const originalBalance = await stakingRewardsContract(networkID, provider, address).balanceOf(address);
    const balance = +ethers.utils.formatEther(originalBalance);
    return { balance, originalBalance };
  },
);

export const getTorBalance = createAsyncThunk(
  "farm/getTorBalance",
  async ({ networkID, provider, address }: IBaseAddressAsyncThunk) => {
    try {
      const originalBalance = await torContract(networkID, provider, address).balanceOf(address);
      const balance = +ethers.utils.formatEther(originalBalance);
      const allowance = +(await torContract(networkID, provider, address).allowance(
        address,
        FANTOM.TOR_MINTER_ADDRESS,
      ));
      return { balance, originalBalance, allowance };
    } catch (e) {
      console.error(e);
    }
  },
);

export const getTorBalanceAmounts = createAsyncThunk(
  "farm/getTorBalanceAmounts",
  async ({ networkID, provider, address, value = '100' }: IValueAsyncThunk) => {
    try {
      const torBalanceAmountsContract = new ethers.Contract(FANTOM.TOR_LP_AMOUNTS_ADDRESS, torPoolAmountAbi, provider);
      const getBalancedPercentages = await torBalanceAmountsContract.getAmounts(ethers.utils.parseUnits(value, 'ether'));
      return {
        dai: +ethers.utils.formatEther(getBalancedPercentages._daiAmount),
        usdc: +ethers.utils.formatUnits(getBalancedPercentages._usdcAmount, 'mwei'),
        tor: +ethers.utils.formatEther(getBalancedPercentages._torAmount)
      } as CurveProportions
    } catch (e) {
      console.error(e);
    }
  },
);

export const getTorPoolInfo = createAsyncThunk(
  "farm/getHugsPoolInfo",
  async ({ networkID, provider, address }: IBaseAddressAsyncThunk) => {
    const originalBalance = await torPoolContract(networkID, provider, address).balanceOf(address);
    let balance = +ethers.utils.formatEther(originalBalance);

    let allowance = +(await torPoolContract(networkID, provider, address).allowance(
      address,
      FANTOM.FARMINNG_STAKING_REWARDS_ADDRESS,
    ));
    let virtualPrice = +ethers.utils.formatEther(
      await torPoolContract(networkID, provider, address).get_virtual_price(),
    );

    return { balance, allowance, virtualPrice, originalBalance };
  },
);

export const getStakingInfo = createAsyncThunk(
  "farm/getStakingInfo",
  async ({ networkID, provider, address, value }: IValueAsyncThunk) => {
    try {
      const amt = BigInt(value === "" ? 0 : +value) * BigInt(1e18);
      return await stakingGateway(networkID, provider).getStakingInfo(address, amt);
    } catch (e) {
      console.error(e);
    }
  },
);

export const unstake = createAsyncThunk("farm/unstake", async ({ networkID, provider, address, value }: IValueAsyncThunk, { dispatch }) => {
  let unstakeTx;
  try {
    unstakeTx = await stakingRewardsContract(networkID, provider, address).withdraw(ethers.utils.parseUnits(value, 'ether'));
    await unstakeTx.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
    await sleep(9);
    dispatch(info(messages.your_balance_updated));
  } catch (e) {
    console.error(e);
    dispatch(error("Failed to withdraw"));
  } finally {
    await dispatch(getStakingRewardsInfo({ networkID, provider, address }));
    await dispatch(getTorPoolInfo({ networkID, provider, address }));

  }
},
);

export const stake = createAsyncThunk("farm/stake", async ({ networkID, provider, address, value }: IValueAsyncThunk, { dispatch }) => {
  let stakeTx;
  try {
    stakeTx = await stakingRewardsContract(networkID, provider, address).stake(ethers.utils.parseUnits(value, "ether"));
    await stakeTx.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
    await sleep(9);
    dispatch(info(messages.your_balance_updated));
  } catch (e) {
    dispatch(error("Failed to stake"));
  } finally {
    if (stakeTx) {
      await dispatch(getStakingRewardsInfo({ networkID, provider, address }));
      await dispatch(getTorPoolInfo({ networkID, provider, address }));

    }
  }
});

export const torPoolApprove = createAsyncThunk("farm/torPoolApprove", async ({ networkID, provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
  try {
    const approveTrans = await torPoolContract(networkID, provider, address).approve(
      FANTOM.FARMINNG_STAKING_REWARDS_ADDRESS,
      ethers.utils.parseUnits("1000000", "ether").toString(),
    );
    await approveTrans.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
    await sleep(9);
    dispatch(info(messages.your_balance_updated));
  } catch (e) {
    console.error(e);
    dispatch(error("Failed to approve"));
  }
});

export const getDaiUsdcBalance = createAsyncThunk("farm/getDaiUsdcBalance", async ({ networkID, provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
  try {
    const usdcHexBalance = await usdcContract(networkID, provider, address).balanceOf(address);
    const daiHexBalance = await daiContract(networkID, provider, address).balanceOf(address);
    const usdcBalance = +ethers.utils.formatUnits(usdcHexBalance, 'mwei');
    const daiBalance = +ethers.utils.formatEther(daiHexBalance);

    return { usdcHexBalance, daiHexBalance, usdcBalance, daiBalance } as DaiUsdcBalance;
  } catch (e) {
    console.error(e);
    dispatch(error("Failed to get balances for dai and usdc"));
  }
});

export const claimRewards = createAsyncThunk("farm/claimRewards", async ({ networkID, provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
  try {
    const stakeTrans = await stakingRewardsContract(networkID, provider, address).getReward();
    await stakeTrans.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
    await sleep(9);
    dispatch(info(messages.your_balance_updated));
  } catch (e) {
    dispatch(error("Failed to claim rewards"));
  }
},
);

export const getCurveAllowance = createAsyncThunk("farm/getCurveAllowance", async ({ networkID, provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
  try {
    const usdcAllowance = await usdcContract(networkID, provider, address).allowance(address, FANTOM.CURVE_FI_ADDRESS);
    const daiAllowance = await daiContract(networkID, provider, address).allowance(address, FANTOM.CURVE_FI_ADDRESS);
    const torAllowance = await torContract(networkID, provider, address).allowance(address, FANTOM.CURVE_FI_ADDRESS);
    const torPoolAllowance = await torPoolContract(networkID, provider, address).allowance(address, FANTOM.CURVE_FI_ADDRESS);
    return { torAllowance, usdcAllowance, daiAllowance, torPoolAllowance } as CurveAllowance;
  } catch (e) {
    console.error(e);
    dispatch(error("Failed to get deposit allowance for curve"));
  }
});

export const curveDaiApprove = createAsyncThunk("farm/curveDaiApprove", async ({ networkID, provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
  let approveTx;
  try {
    approveTx = await daiContract(networkID, provider, address).approve(
      FANTOM.CURVE_FI_ADDRESS,
      ethers.utils.parseUnits("1000000", "ether"),
    );
    await approveTx.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
    await sleep(9);
  } catch (e) {
    console.error(e);
    dispatch(error("Failed to approve DAI"));
  } finally {
    if (approveTx) {
      await dispatch(getCurveAllowance({ networkID, provider, address }))
      dispatch(info(messages.your_balance_updated));

    }
  }
});
export const curveUsdcApprove = createAsyncThunk("farm/curveUsdcApprove", async ({ networkID, provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
  let approveTx;
  try {
    approveTx = await usdcContract(networkID, provider, address).approve(
      FANTOM.CURVE_FI_ADDRESS,
      ethers.utils.parseUnits("1000000", "ether"),
    );
    await approveTx.wait();

    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
    await sleep(9);
  } catch (e) {
    console.error(e);
    dispatch(error("Failed to approve USDC"));
  } finally {
    if (approveTx) {
      await dispatch(getCurveAllowance({ networkID, provider, address }));
      dispatch(info(messages.your_balance_updated));

    }
  }
});
export const curveTorApprove = createAsyncThunk("farm/curveTorApprove", async ({ networkID, provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
  let approveTx;
  try {
    approveTx = await torContract(networkID, provider, address).approve(
      FANTOM.CURVE_FI_ADDRESS,
      ethers.utils.parseUnits("1000000", "ether").toString()
    );
    await approveTx.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
    await sleep(9);
  } catch (e) {
    console.error(e);
    dispatch(error("Failed to approve TOR"));
  } finally {
    if (approveTx) {
      await dispatch(getCurveAllowance({ networkID, provider, address }));
      dispatch(info(messages.your_balance_updated));

    }
  }
});

export const curveWithdrawApprove = createAsyncThunk("farm/curveWithdrawApprove", async ({ networkID, provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
  let approveTx;
  try {
    approveTx = await torPoolContract(networkID, provider, address).approve(
      FANTOM.CURVE_FI_ADDRESS,
      ethers.utils.parseUnits("1000000", "ether").toString(),
    );
    await approveTx.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
    await sleep(9);
    dispatch(info(messages.your_balance_updated));
  } catch (e) {
    console.error(e);
    dispatch(error("Failed to approve"));
  } finally {
    if (approveTx) {
      dispatch(getCurveAllowance({ networkID, provider, address }));
    }
  }
});

export const depositCurveTokens = createAsyncThunk("farm/depositCurveTokens", async ({ networkID, provider, address, torAmount, daiAmount, usdcAmount }: ICurveTokensThunk, { dispatch }) => {
  let depositTx;
  try {
    depositTx = await curveFiContract(networkID, provider, address)["add_liquidity(address,uint256[3],uint256)"](FANTOM.TOR_LP_POOL_ADDRESS, [ethers.utils.parseUnits(torAmount), ethers.utils.parseUnits(daiAmount), ethers.utils.parseUnits(usdcAmount, "mwei")], 1);
    await depositTx.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));

  } catch (e) {
    console.error(e)
    dispatch(error("Failed to depost into curve"));
  } finally {
    await sleep(9);
    await dispatch(getDaiUsdcBalance({ networkID, provider, address }))
    await dispatch(getTorBalance({ networkID, provider, address }));
    await dispatch(getTorPoolInfo({ networkID, provider, address }));
    if (depositTx) {
      dispatch(info(messages.your_balance_updated));
    }
  }
},
);

export const withdrawCurveTokens = createAsyncThunk("farm/withdrawCurveTokens", async ({ networkID, provider, address, lpBalance, torAmount, daiAmount, usdcAmount }: ICurveTokensThunk, { dispatch }) => {
  let withdrawTx;
  try {
    withdrawTx = await curveFiContract(networkID, provider, address)["remove_liquidity(address,uint256,uint256[3])"](FANTOM.TOR_LP_POOL_ADDRESS, lpBalance, [ethers.utils.parseUnits(torAmount), ethers.utils.parseUnits(daiAmount), ethers.utils.parseUnits(usdcAmount, "mwei")]);
    await withdrawTx.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
  } catch (e) {
    console.error(e)
    dispatch(error("Failed to withdraw into curve"));
  } finally {
    await sleep(9);
    await dispatch(getDaiUsdcBalance({ networkID, provider, address }));
    await dispatch(getTorBalance({ networkID, provider, address }));
    await dispatch(getTorPoolInfo({ networkID, provider, address }));
    if (withdrawTx) {
      dispatch(info(messages.your_balance_updated));
    }
  }
},
);
export const withdrawOneCurveTokens = createAsyncThunk("farm/withdrawOneCurveTokens", async ({ networkID, provider, address, lpBalance, coin }: ICurveTokensThunk, { dispatch }) => {
  let withdrawTx;
  try {
    withdrawTx = await curveFiContract(networkID, provider, address)["remove_liquidity_one_coin(address,uint256,int128,uint256)"](FANTOM.TOR_LP_POOL_ADDRESS, lpBalance, coin, 1);
    await withdrawTx.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
  } catch (e) {
    console.error(e)
    dispatch(error("Failed to withdraw into token"));
  } finally {
    await sleep(9);
    await dispatch(getDaiUsdcBalance({ networkID, provider, address }));
    await dispatch(getTorBalance({ networkID, provider, address }));
    await dispatch(getTorPoolInfo({ networkID, provider, address }));
    if (withdrawTx) {
      dispatch(info(messages.your_balance_updated));
    }
  }
},
);

const torRedeemContract = (provider: JsonRpcProvider, address: string) =>
  new ethers.Contract(FANTOM.TOR_REDEEM_ADDRESS, torRedeemAbi, provider.getSigner(address));

export const getMintInfo = createAsyncThunk("farm/getMintInfo", async ({ networkID, provider, address, value }: IValueAsyncThunk, { dispatch }) => {
  try {
    const redeemContract = torRedeemContract(provider, address);
    const isLowerThanReserveCeiling = await redeemContract.lowerThanReserveCeilingAfterMint(ethers.utils.parseEther(value));
    const isCurvePercentageBelowCeiling = await redeemContract.curvePercentageBelowCeiling(ethers.utils.parseEther(value));
    const mintLimit = await redeemContract.getCurrentMintBuffer();
    return { isLowerThanReserveCeiling, isCurvePercentageBelowCeiling, mintLimit };
  } catch (e) {
    console.error(e);
    dispatch(error(`Failed to get mint info`));
  }
});

export const getRedeemInfo = createAsyncThunk("farm/getRedeemInfo", async ({ networkID, provider, address, value }: IValueAsyncThunk, { dispatch }) => {
  try {
    const redeemContract = torRedeemContract(provider, address);
    const ishigherThanReserveFloor = await redeemContract.higherThanReserveFloorAfterRedeem(ethers.utils.parseEther(value));
    const isCurvePercentageAboveFloor = await redeemContract.curvePercentageAboveFloor(ethers.utils.parseEther(value));
    const redeemLimit = await redeemContract.getCurrentRedeemBuffer();
    return { ishigherThanReserveFloor, isCurvePercentageAboveFloor, redeemLimit };
  } catch (e) {
    console.error(e);
    dispatch(error(`Failed to get redeem info`));
  }
});

export const mint = createAsyncThunk("farm/mint", async ({ networkID, provider, address, value, mint }: MintThunk, { dispatch }) => {
  let mintTx;
  try {
    if (mint === 'dai') {
      mintTx = await torMinterContract(networkID, provider, address).mintWithDai(ethers.utils.parseUnits(value, "ether"));
    } else {
      mintTx = await torMinterContract(networkID, provider, address).mintWithUsdc(ethers.utils.parseUnits(value, "mwei"));
    }
    await mintTx.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
    await sleep(9);
  } catch (e) {
    console.error(e);
    dispatch(error(`Failed to mint ${mint}`));
  } finally {
    if (mintTx) {
      await dispatch(getDaiUsdcBalance({ networkID, provider, address }));
      await dispatch(getTorBalance({ networkID, provider, address }));
      dispatch(info(messages.your_balance_updated));
    }
  }
});

export const redeem = createAsyncThunk("farm/redeem", async ({ networkID, provider, address, value, mint }: MintThunk, { dispatch }) => {
  let redeemTx;
  try {
    if (mint === 'dai') {
      redeemTx = await torMinterContract(networkID, provider, address).redeemToDai(ethers.utils.parseUnits(value, "ether"));
    } else {
      redeemTx = await torMinterContract(networkID, provider, address).redeemToUsdc(ethers.utils.parseUnits(value, "ether"));
    }
    await redeemTx.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
    await sleep(9);
  } catch (e) {
    console.error(e);
    dispatch(error(`Failed to redeem ${mint}`));
  } finally {
    if (redeemTx) {
      await dispatch(getDaiUsdcBalance({ networkID, provider, address }));
      await dispatch(getTorBalance({ networkID, provider, address }));
      dispatch(info(messages.your_balance_updated));
    }
  }
});

export const getMintAllowance = createAsyncThunk("farm/getMintAllowance", async ({ networkID, provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
  try {
    const usdcAllowance = await usdcContract(networkID, provider, address).allowance(address, FANTOM.TOR_MINTER_ADDRESS);
    const daiAllowance = await daiContract(networkID, provider, address).allowance(address, FANTOM.TOR_MINTER_ADDRESS);
    const torAllowance = await torContract(networkID, provider, address).allowance(address, FANTOM.TOR_MINTER_ADDRESS)
    return { usdcAllowance, daiAllowance, torAllowance };
  } catch (e) {
    console.error(e);
    dispatch(error("Failed to get allowance for minting"));
  }
});


export const daiMintApprove = createAsyncThunk("farm/daiMintApprove", async ({ networkID, provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
  let daiMintTx;
  try {
    daiMintTx = await daiContract(networkID, provider, address).approve(
      FANTOM.TOR_MINTER_ADDRESS,
      ethers.utils.parseUnits("1000000", "ether"),
    );
    await daiMintTx.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
    await sleep(9);
  } catch (e) {
    console.error(e);
    dispatch(error("Failed to approve DAI"));
  } finally {
    if (daiMintTx) {
      await dispatch(getMintAllowance({ networkID, provider, address }));
      dispatch(info(messages.your_balance_updated));

    }
  }
});

export const usdcMintApprove = createAsyncThunk("farm/usdcMintApprove", async ({ networkID, provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
  let usdcMintTx;
  try {
    usdcMintTx = await usdcContract(networkID, provider, address).approve(
      FANTOM.TOR_MINTER_ADDRESS,
      ethers.utils.parseUnits("1000000", "ether"),
    );
    await usdcMintTx.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
    await sleep(9);
  } catch (e) {
    console.error(e);
    dispatch(error("Failed to approve USDC"));
  } finally {
    if (usdcMintTx) {
      await dispatch(getMintAllowance({ networkID, provider, address }));
      dispatch(info(messages.your_balance_updated));
    }
  }
});

export const redeemApprove = createAsyncThunk("farm/redeemApprove", async ({ networkID, provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
  let redeemTx;
  try {
    redeemTx = await torContract(networkID, provider, address).approve(
      FANTOM.TOR_MINTER_ADDRESS,
      ethers.utils.parseUnits("1000000", "ether").toString(),
    );
    await redeemTx.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
    await sleep(9);
  } catch (e) {
    console.error(e);
    dispatch(error("Failed to approve DAI"));
  } finally {
    if (redeemTx) {
      await dispatch(getMintAllowance({ networkID, provider, address }));
      dispatch(info(messages.your_balance_updated));
    }
  }
});

const initialState: IFarmSlice = {
  isLoading: false,
  assetPrice: undefined,
  stakingRewardsInfo: undefined,
  torPoolInfo: undefined,
  stakingInfo: undefined,
  curveProportions: undefined,
  daiUsdcBalance: undefined,
  torBalance: undefined,
  mintAllowance: undefined,
  mintInfo: undefined,
  redeemInfo: undefined,
  curveAllowance: undefined,
};

interface IFarmSlice {
  isLoading: boolean;
  assetPrice: BigNumber;
  stakingRewardsInfo: StakingRewardsInfo;
  torPoolInfo: TorPoolInfo;
  stakingInfo: StakingInfo;
  curveProportions: CurveProportions;
  daiUsdcBalance: DaiUsdcBalance;
  torBalance: TorBalance;
  mintAllowance: MintAllowance;
  mintInfo: MintInfo;
  redeemInfo: RedeemInfo;
  curveAllowance: CurveAllowance;
}

const farmSlice = createSlice({
  name: "farm",
  initialState,
  reducers: {
    fetchAppSuccess(state, action) {
      setAll(state, action.payload);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(getAssetPrice.pending, state => {
        state.isLoading = true;
      })
      .addCase(getAssetPrice.fulfilled, (state, action) => {
        state.assetPrice = action.payload;
        state.isLoading = false;
      })
      .addCase(getAssetPrice.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(getStakingRewardsInfo.pending, state => {
        state.isLoading = true;
      })
      .addCase(getStakingRewardsInfo.fulfilled, (state, action) => {
        state.stakingRewardsInfo = action.payload;
        state.isLoading = false;
      })
      .addCase(getStakingRewardsInfo.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(getTorPoolInfo.pending, state => {
        state.isLoading = true;
      })
      .addCase(getTorPoolInfo.fulfilled, (state, action) => {
        state.torPoolInfo = action.payload;
        state.isLoading = false;
      })
      .addCase(getTorPoolInfo.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(getDaiUsdcBalance.pending, state => {
        state.isLoading = true;
      })
      .addCase(getDaiUsdcBalance.fulfilled, (state, action) => {
        state.daiUsdcBalance = action.payload;
        state.isLoading = false;
      })
      .addCase(getDaiUsdcBalance.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(getStakingInfo.pending, state => {
        state.isLoading = true;
      })
      .addCase(getStakingInfo.fulfilled, (state, action) => {
        state.stakingInfo = action.payload;
        state.isLoading = false;
      })
      .addCase(getStakingInfo.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(unstake.pending, state => {
        state.isLoading = true;
      })
      .addCase(unstake.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(unstake.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(stake.pending, state => {
        state.isLoading = true;
      })
      .addCase(stake.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(stake.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(claimRewards.pending, state => {
        state.isLoading = true;
      })
      .addCase(claimRewards.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(claimRewards.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(torPoolApprove.pending, state => {
        state.isLoading = true;
      })
      .addCase(torPoolApprove.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(torPoolApprove.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(daiMintApprove.pending, state => {
        state.isLoading = true;
      })
      .addCase(daiMintApprove.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(daiMintApprove.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(redeemApprove.pending, state => {
        state.isLoading = true;
      })
      .addCase(redeemApprove.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(redeemApprove.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(usdcMintApprove.pending, state => {
        state.isLoading = true;
      })
      .addCase(usdcMintApprove.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(usdcMintApprove.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(curveDaiApprove.pending, state => {
        state.isLoading = true;
      })
      .addCase(curveDaiApprove.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(curveDaiApprove.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(curveUsdcApprove.pending, state => {
        state.isLoading = true;
      })
      .addCase(curveUsdcApprove.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(curveUsdcApprove.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(curveTorApprove.pending, state => {
        state.isLoading = true;
      })
      .addCase(curveTorApprove.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(curveTorApprove.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(curveWithdrawApprove.pending, state => {
        state.isLoading = true;
      })
      .addCase(curveWithdrawApprove.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(curveWithdrawApprove.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(getMintAllowance.pending, state => {
        state.isLoading = true;
      })
      .addCase(getMintAllowance.fulfilled, (state, action) => {
        state.mintAllowance = action.payload;
        state.isLoading = false;
      })
      .addCase(getMintAllowance.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(getCurveAllowance.pending, state => {
        state.isLoading = true;
      })
      .addCase(getCurveAllowance.fulfilled, (state, action) => {
        state.curveAllowance = action.payload;
        state.isLoading = false;
      })
      .addCase(getCurveAllowance.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(getTorBalance.pending, state => {
        state.isLoading = true;
      })
      .addCase(getTorBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.torBalance = action.payload;
      })
      .addCase(getTorBalance.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(getTorBalanceAmounts.pending, state => {
        state.isLoading = true;
      })
      .addCase(getTorBalanceAmounts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.curveProportions = action.payload;
      })
      .addCase(getTorBalanceAmounts.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(mint.pending, state => {
        state.isLoading = true;
      })
      .addCase(mint.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(mint.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(redeem.pending, state => {
        state.isLoading = true;
      })
      .addCase(redeem.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(redeem.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(getMintInfo.pending, state => {
        state.isLoading = true;
      })
      .addCase(getMintInfo.fulfilled, (state, action) => {
        state.mintInfo = action.payload;
        state.isLoading = false;
      })
      .addCase(getMintInfo.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(getRedeemInfo.pending, state => {
        state.isLoading = true;
      })
      .addCase(getRedeemInfo.fulfilled, (state, action) => {
        state.redeemInfo = action.payload;
        state.isLoading = false;
      })
      .addCase(getRedeemInfo.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(depositCurveTokens.pending, state => {
        state.isLoading = true;
      })
      .addCase(depositCurveTokens.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(depositCurveTokens.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(withdrawCurveTokens.pending, state => {
        state.isLoading = true;
      })
      .addCase(withdrawCurveTokens.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(withdrawCurveTokens.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(withdrawOneCurveTokens.pending, state => {
        state.isLoading = true;
      })
      .addCase(withdrawOneCurveTokens.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(withdrawOneCurveTokens.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })

  },
});

const baseInfo = (state: RootState) => state.farm;

export default farmSlice.reducer;

export const { fetchAppSuccess } = farmSlice.actions;

export const getAppState = createSelector(baseInfo, app => app);