import { JsonRpcProvider } from "@ethersproject/providers";
import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import { BigNumber, ethers } from "ethers";
import { NETWORKS, messages } from "src/constants";
import { setAll } from "src/helpers";
import { sleep } from "src/helpers/Sleep";
import { RootState } from "src/store";
import {
  HugsPoolContract,
  HugsPoolInfo,
  StakingInfo,
  StakingRewardsContract,
  StakingRewardsInfo,
} from "src/types/farming.model";
import { abi as farmingAggregatorAbi } from "../abi/farmingAggregatorContract.json";
import { abi as hugsPoolAbi } from "../abi/farmingHugsPoolContract.json";
import { abi as stakingRewardsAbi } from "../abi/farmingStakingRewardsContract.json";
import { IBaseAddressAsyncThunk, IBaseAsyncThunk, IValueAsyncThunk } from "./interfaces";
import { error, info, success } from "./MessagesSlice";

const stakingGateway = (chainID: number, provider: JsonRpcProvider) =>
  new ethers.Contract(NETWORKS.get(chainID).FARMING_AGGREGATOR_ADDRESS, farmingAggregatorAbi, provider);

const stakingRewardsContract = (chainID: number, provider: JsonRpcProvider, address: string) =>
  (new ethers.Contract(
    NETWORKS.get(chainID).FARMINNG_STAKING_REWARDS_ADDRESS,
    stakingRewardsAbi,
    provider.getSigner(address),
  ) as unknown) as StakingRewardsContract;

const hugsPoolContract = (chainID: number, provider: JsonRpcProvider, address: string) =>
  (new ethers.Contract(
    NETWORKS.get(chainID).HUGS_POOL_ADDRESS,
    hugsPoolAbi,
    provider.getSigner(address),
  ) as unknown) as HugsPoolContract;

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

export const getHugsPoolInfo = createAsyncThunk(
  "farm/getHugsPoolInfo",
  async ({ networkID, provider, address }: IBaseAddressAsyncThunk) => {
    const originalBalance = await hugsPoolContract(networkID, provider, address).balanceOf(address);
    let balance = +ethers.utils.formatEther(originalBalance);

    let allowance = +(await hugsPoolContract(networkID, provider, address).allowance(
      address,
      NETWORKS.get(networkID).FARMINNG_STAKING_REWARDS_ADDRESS,
    ));
    let virtualPrice = +ethers.utils.formatEther(
      await hugsPoolContract(networkID, provider, address).get_virtual_price(),
    );

    return { balance, allowance, virtualPrice, originalBalance };
  },
);

export const getStakingInfo = createAsyncThunk(
  "farm/getStakingInfo",
  async ({ networkID, provider, address, value }: IValueAsyncThunk) => {
    const amt = BigInt(value === "" ? 0 : +value) * BigInt(1e18);
    return await stakingGateway(networkID, provider).getStakingInfo(address, amt);
  },
);

export const withDrawStaked = createAsyncThunk("farm/withDrawStaked", async ({ networkID, provider, address, value }: IValueAsyncThunk, { dispatch }) => {
  try {
    const withdrawTrans = await stakingRewardsContract(networkID, provider, address).withdraw(ethers.utils.parseUnits(value, 'ether'));
    await withdrawTrans.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
    await sleep(9);
    dispatch(info(messages.your_balance_updated));
  } catch (e) {
    console.log(e);
    dispatch(error("Failed to withdraw"));
  }
},
);

export const stake = createAsyncThunk("farm/stake", async ({ networkID, provider, address, value }: IValueAsyncThunk, { dispatch }) => {
  try {
    const stakeTrans = await stakingRewardsContract(networkID, provider, address).stake(ethers.utils.parseUnits(value, "ether"));
    await stakeTrans.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
    await sleep(9);
    dispatch(info(messages.your_balance_updated));
  } catch (e) {
    dispatch(error("Failed to stake"));
  }
});

export const approve = createAsyncThunk("farm/approve", async ({ networkID, provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
  try {
    const approveTrans = await hugsPoolContract(networkID, provider, address).approve(
      addresses[networkID].FARMINNG_STAKING_REWARDS_ADDRESS as string,
      "1000000000000000000000000",
    );
    await approveTrans.wait();
    dispatch(success(messages.tx_successfully_send));
    await sleep(7);
    dispatch(info(messages.your_balance_update_soon));
    await sleep(9);
    dispatch(info(messages.your_balance_updated));
  } catch (e) {
    dispatch(error("Failed to approve"));
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

const initialState: IFarmSlice = {
  isLoading: false,
  assetPrice: undefined,
  stakingRewardsInfo: undefined,
  hugsPoolInfo: undefined,
  stakingInfo: undefined,
};

interface IFarmSlice {
  isLoading: boolean;
  assetPrice: BigNumber;
  stakingRewardsInfo: StakingRewardsInfo;
  hugsPoolInfo: HugsPoolInfo;
  stakingInfo: StakingInfo;
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
      });
  },
});

const baseInfo = (state: RootState) => state.farm;

export default farmSlice.reducer;

export const { fetchAppSuccess } = farmSlice.actions;

export const getAppState = createSelector(baseInfo, app => app);
