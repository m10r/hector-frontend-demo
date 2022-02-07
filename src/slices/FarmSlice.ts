import { JsonRpcProvider } from "@ethersproject/providers";
import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import { BigNumber, ethers } from "ethers";
import { messages, DEFAULT_NETWORK, FANTOM } from "src/constants";
import { setAll } from "src/helpers";
import { sleep } from "src/helpers/Sleep";
import { RootState } from "src/store";
import {
  HugsPoolContract,
  HugsPoolInfo,
  MintAllowance,
  StakingInfo,
  StakingRewardsContract,
  StakingRewardsInfo,
  TorContract,
  TorInfo,
} from "src/types/farming.model";
import { abi as farmingAggregatorAbi } from "../abi/farmingAggregatorContract.json";
import { abi as hugsPoolAbi } from "../abi/farmingHugsPoolContract.json";
import { abi as stakingRewardsAbi } from "../abi/farmingStakingRewardsContract.json";
import { abi as whitelistAbi } from "../abi/WhitelistContract.json";
import { abi as torAbi } from "../abi/bonds/torContract.json";
import { abi as IERC20 } from "../abi/IERC20.json";
import { abi as torMinterAbi } from "../abi/TorMinterContract.json";
import { IBaseAddressAsyncThunk, IBaseAsyncThunk, IValueAsyncThunk } from "./interfaces";
import { error, info, success } from "./MessagesSlice";

interface MintThunk extends IValueAsyncThunk {
  mint: "dai" | "usdc";
}

const stakingGateway = (provider: JsonRpcProvider) =>
  new ethers.Contract(FANTOM.FARMING_AGGREGATOR_ADDRESS, farmingAggregatorAbi, provider);

const stakingRewardsContract = (chainID: number, provider: JsonRpcProvider, address: string) =>
  (new ethers.Contract(
    FANTOM.FARMINNG_STAKING_REWARDS_ADDRESS,
    stakingRewardsAbi,
    provider.getSigner(address),
  ) as unknown) as StakingRewardsContract;

const hugsPoolContract = (chainID: number, provider: JsonRpcProvider, address: string) =>
  (new ethers.Contract(
    FANTOM.HUGS_POOL_ADDRESS,
    hugsPoolAbi,
    provider.getSigner(address),
  ) as unknown) as HugsPoolContract;

const torContract = (chainID: number, provider: JsonRpcProvider) =>
  (new ethers.Contract(FANTOM.TOR_ADDRESS, torAbi, provider) as unknown) as TorContract;

const usdcContract = (provider: JsonRpcProvider, address: string) =>
  new ethers.Contract(FANTOM.USDC_ADDRESS, IERC20, provider.getSigner(address));
const daiContract = (provider: JsonRpcProvider, address: string) =>
  new ethers.Contract(FANTOM.DAI_ADDRESS, IERC20, provider.getSigner(address));

const torMinterContract = (chainID: number, provider: JsonRpcProvider, address: string) =>
  new ethers.Contract(FANTOM.TOR_MINTER_ADDRESS, torMinterAbi, provider.getSigner(address));
export const getAssetPrice = createAsyncThunk(
  "farm/getAssetPrice",
  async ({ networkID, provider }: IBaseAsyncThunk) => (await stakingGateway(provider).assetPrice()) as BigNumber,
);

export const getStakingRewardsInfo = createAsyncThunk(
  "farm/getStakingRewardsInfo",
  async ({ networkID, provider, address }: IBaseAddressAsyncThunk) => {
    const originalBalance = await stakingRewardsContract(networkID, provider, address).balanceOf(address);
    const balance = +ethers.utils.formatEther(originalBalance);
    return { balance, originalBalance };
  },
);

export const getTorInfo = createAsyncThunk(
  "farm/getTorBalance",
  async ({ networkID, provider, address }: IBaseAddressAsyncThunk) => {
    try {
      const originalBalance = await torContract(DEFAULT_NETWORK, provider).balanceOf(address);
      const balance = +ethers.utils.formatEther(originalBalance);
      const allowance = +(await torContract(DEFAULT_NETWORK, provider).allowance(address, FANTOM.TOR_MINTER_ADDRESS));
      return { balance, originalBalance, allowance };
    } catch (e) {
      console.error(e);
    }
  },
);

export const getHugsPoolInfo = createAsyncThunk(
  "farm/getHugsPoolInfo",
  async ({ networkID, provider, address }: IBaseAddressAsyncThunk) => {
    const originalBalance = await hugsPoolContract(DEFAULT_NETWORK, provider, address).balanceOf(address);
    let balance = +ethers.utils.formatEther(originalBalance);

    let allowance = +(await hugsPoolContract(DEFAULT_NETWORK, provider, address).allowance(
      address,
      FANTOM.FARMINNG_STAKING_REWARDS_ADDRESS,
    ));
    let virtualPrice = +ethers.utils.formatEther(
      await hugsPoolContract(DEFAULT_NETWORK, provider, address).get_virtual_price(),
    );

    return { balance, allowance, virtualPrice, originalBalance };
  },
);

export const getStakingInfo = createAsyncThunk(
  "farm/getStakingInfo",
  async ({ networkID, provider, address, value }: IValueAsyncThunk) => {
    try {
      const amt = BigInt(value === "" ? 0 : +value) * BigInt(1e18);
      return await stakingGateway(provider).getStakingInfo(address, amt);
    } catch (e) {
      console.error(e);
    }
  },
);

export const withDrawStaked = createAsyncThunk(
  "farm/withDrawStaked",
  async ({ networkID, provider, address, value }: IValueAsyncThunk, { dispatch }) => {
    try {
      const withdrawTrans = await stakingRewardsContract(DEFAULT_NETWORK, provider, address).withdraw(
        ethers.utils.parseUnits(value, "ether"),
      );
      await withdrawTrans.wait();
      dispatch(success(messages.tx_successfully_send));
      await sleep(7);
      dispatch(info(messages.your_balance_update_soon));
      await sleep(9);
      dispatch(info(messages.your_balance_updated));
    } catch (e) {
      console.error(e);
      dispatch(error("Failed to withdraw"));
    }
  },
);

export const stake = createAsyncThunk(
  "farm/stake",
  async ({ networkID, provider, address, value }: IValueAsyncThunk, { dispatch }) => {
    try {
      const stakeTrans = await stakingRewardsContract(DEFAULT_NETWORK, provider, address).stake(
        ethers.utils.parseUnits(value, "ether"),
      );
      await stakeTrans.wait();
      dispatch(success(messages.tx_successfully_send));
      await sleep(7);
      dispatch(info(messages.your_balance_update_soon));
      await sleep(9);
      dispatch(info(messages.your_balance_updated));
    } catch (e) {
      dispatch(error("Failed to stake"));
    }
  },
);

export const approve = createAsyncThunk(
  "farm/approve",
  async ({ networkID, provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
    try {
      const approveTrans = await hugsPoolContract(DEFAULT_NETWORK, provider, address).approve(
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
  },
);

export const daiApprove = createAsyncThunk(
  "farm/daiApprove",
  async ({ provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
    try {
      const approveTrans = await daiContract(provider, address).approve(
        FANTOM.TOR_MINTER_ADDRESS,
        ethers.utils.parseUnits("1000000", "ether"),
      );
      await approveTrans.wait();
      dispatch(success(messages.tx_successfully_send));
      await sleep(7);
      dispatch(info(messages.your_balance_update_soon));
      await sleep(9);
      dispatch(info(messages.your_balance_updated));
    } catch (e) {
      console.error(e);
      dispatch(error("Failed to approve DAI"));
    }
  },
);
export const usdcApprove = createAsyncThunk(
  "farm/usdcApprove",
  async ({ provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
    try {
      const approveTrans = await usdcContract(provider, address).approve(
        FANTOM.TOR_MINTER_ADDRESS,
        ethers.utils.parseUnits("1000000", "ether"),
      );
      await approveTrans.wait();
      dispatch(success(messages.tx_successfully_send));
      await sleep(7);
      dispatch(info(messages.your_balance_update_soon));
      await sleep(9);
      dispatch(info(messages.your_balance_updated));
    } catch (e) {
      console.error(e);
      dispatch(error("Failed to approve USDC"));
    }
  },
);

export const getMintAllowance = createAsyncThunk(
  "farm/getMintAllowance",
  async ({ provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
    try {
      const usdcAllowance = await usdcContract(provider, address).allowance(address, FANTOM.TOR_MINTER_ADDRESS);
      const daiAllowance = await daiContract(provider, address).allowance(address, FANTOM.TOR_MINTER_ADDRESS);
      return { usdcAllowance, daiAllowance };
    } catch (e) {
      console.error(e);
      dispatch(error("Failed to get allowance for minting"));
    }
  },
);

export const claimRewards = createAsyncThunk(
  "farm/claimRewards",
  async ({ networkID, provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
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

export const mint = createAsyncThunk(
  "farm/mint",
  async ({ networkID, provider, address, value, mint }: MintThunk, { dispatch }) => {
    try {
      let mintTrans;
      if (mint === "dai") {
        mintTrans = await torMinterContract(networkID, provider, address).mintWithDai(
          ethers.utils.parseUnits(value, "ether"),
        );
      } else {
        mintTrans = await torMinterContract(networkID, provider, address).mintWithUsdc(
          ethers.utils.parseUnits(value, "mwei"),
        );
      }
      await mintTrans.wait();
      dispatch(success(messages.tx_successfully_send));
      await sleep(7);
      dispatch(info(messages.your_balance_update_soon));
      await sleep(9);
      dispatch(info(messages.your_balance_updated));
    } catch (e) {
      console.error(e);
      dispatch(error(`Failed to mint ${mint}`));
    }
  },
);

export const getWhitelistAmount = createAsyncThunk(
  "farm/getWhitelistAmount",
  async ({ networkID, provider, address }: IBaseAddressAsyncThunk) => {
    const whiteListContract = new ethers.Contract(FANTOM.TOR_WHITELIST, whitelistAbi, provider);
    const minted = await whiteListContract.minted(address);
    const limitPerAccount = await whiteListContract.limitPerAccount();
    return { minted, limitPerAccount };
  },
);

const initialState: IFarmSlice = {
  isLoading: false,
  assetPrice: undefined,
  stakingRewardsInfo: undefined,
  hugsPoolInfo: undefined,
  stakingInfo: undefined,
  torInfo: undefined,
  mintAllowance: undefined,
  whiteList: undefined,
};

interface IFarmSlice {
  isLoading: boolean;
  assetPrice: BigNumber;
  stakingRewardsInfo: StakingRewardsInfo;
  hugsPoolInfo: HugsPoolInfo;
  stakingInfo: StakingInfo;
  torInfo: TorInfo;
  mintAllowance: MintAllowance;
  whiteList: any;
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
      .addCase(getHugsPoolInfo.pending, state => {
        state.isLoading = true;
      })
      .addCase(getHugsPoolInfo.fulfilled, (state, action) => {
        state.hugsPoolInfo = action.payload;
        state.isLoading = false;
      })
      .addCase(getHugsPoolInfo.rejected, (state, { error }) => {
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
      .addCase(withDrawStaked.pending, state => {
        state.isLoading = true;
      })
      .addCase(withDrawStaked.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(withDrawStaked.rejected, (state, { error }) => {
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
      .addCase(approve.pending, state => {
        state.isLoading = true;
      })
      .addCase(approve.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(approve.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(daiApprove.pending, state => {
        state.isLoading = true;
      })
      .addCase(daiApprove.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(daiApprove.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      })
      .addCase(usdcApprove.pending, state => {
        state.isLoading = true;
      })
      .addCase(usdcApprove.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(usdcApprove.rejected, (state, { error }) => {
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
      .addCase(getTorInfo.pending, state => {
        state.isLoading = true;
      })
      .addCase(getTorInfo.fulfilled, (state, action) => {
        state.isLoading = false;
        state.torInfo = action.payload;
      })
      .addCase(getTorInfo.rejected, (state, { error }) => {
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
      .addCase(getWhitelistAmount.pending, state => {
        state.isLoading = true;
      })
      .addCase(getWhitelistAmount.fulfilled, (state, action) => {
        state.whiteList = action.payload;
        state.isLoading = false;
      })
      .addCase(getWhitelistAmount.rejected, (state, { error }) => {
        state.isLoading = false;
        console.error(error.name, error.message, error.stack);
      });
  },
});

const baseInfo = (state: RootState) => state.farm;

export default farmSlice.reducer;

export const { fetchAppSuccess } = farmSlice.actions;

export const getAppState = createSelector(baseInfo, app => app);
