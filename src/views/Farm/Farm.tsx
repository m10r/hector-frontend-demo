import "./farm.scss";
import { FC, ReactNode, useCallback, useEffect, useMemo, useState, VFC } from "react";
import { BigNumber, ethers } from "ethers";
import {
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  Modal,
  OutlinedInput,
  Radio,
  RadioGroup,
  SvgIcon,
  Switch,
  Tab,
  Tabs,
  Tooltip,
} from "@material-ui/core";
import { useWeb3Context } from "src/hooks/web3Context";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "src/store";
import {
  torPoolApprove,
  claimRewards,
  depositCurveTokens,
  getAssetPrice,
  getTorPoolInfo,
  getStakingInfo,
  getStakingRewardsInfo,
  getTorBalanceAmounts,
  getTorBalance,
  withdrawCurveTokens,
  unstake,
  getDaiUsdcBalance,
  withdrawOneCurveTokens,
  getCurveAllowance,
  curveDaiApprove,
  curveUsdcApprove,
  curveTorApprove,
  curveWithdrawApprove,
  stakingGateway,
  getWftmBalance,
  getTorWftmPool,
  stake,
  getTorWftmFarm,
  torWftmPoolApprove,
  stakeTorWftm,
  unstakeTorWftm,
  claimTorWftm,
  genericStakingGateway,
} from "src/slices/FarmSlice";
import { ReactComponent as ArrowUp } from "../../assets/icons/arrow-up.svg";
import { ReactComponent as SpookySwap } from "../../assets/icons/spookyswap.svg";
import { ReactComponent as AddToWallet } from "../../assets/icons/add-to-wallet.svg";
import { Skeleton } from "@material-ui/lab";
import { ReactComponent as TorSVG } from "../../assets/tokens/TOR.svg";
import { ReactComponent as WftmSvg } from "../../assets/tokens/wFTM.svg";
import TabPanel from "src/components/TabPanel";
import { error } from "src/slices/MessagesSlice";
import DaiToken from "../../assets/tokens/DAI.svg";
import UsdcToken from "../../assets/tokens/USDC.svg";
import curveToken from "../../assets/tokens/curve.png";
import { ReactComponent as BestFarmIcon } from "../../assets/icons/best-farm.svg";
import farmingInfoDark from "../../assets/Farming-info-dark.png";
import farmingInfoLight from "../../assets/Farming-info-light.png";
import HelpOutlineIcon from "@material-ui/icons/HelpOutline";
import CancelIcon from "@material-ui/icons/Cancel";
import {
  decimalsFromDenomination,
  Denomination,
  formatCurrency,
  prettyEthersNumber,
  trimDecimalsPast,
} from "src/helpers";
import useTheme from "src/hooks/useTheme";
import { FANTOM, MWEI_PER_ETHER } from "src/constants";
import { HECTOR_ENV } from "src/helpers/Environment";

type UserAction = "stake" | "unstake" | "approve" | "mint" | "deposit" | "withdraw";
function a11yProps(index: any) {
  return {
    "id": `rewards-tab-${index}`,
    "aria-controls": `rewards-tabpanel-${index}`,
  };
}
function curveInputProps(index: any) {
  return {
    "id": `curve-tab-${index}`,
    "aria-controls": `curve-tabpanel-${index}`,
  };
}

type PoolToken = "DAI" | "TOR" | "USDC";

const Zero = ethers.constants.Zero;

const QUANTITY = ethers.utils.parseEther("10000");

export const PoolFarming: VFC = () => {
  const dispatch = useDispatch();
  const {
    torPoolInfo,
    torWftmPool,
    torWftmFarm,
    torBalance,
    stakingInfo,
    daiUsdcBalance,
    wftmBalance,
    stakingRewardsInfo,
    assetPrice,
  } = useSelector((state: RootState) => state.farm);

  const { provider, chainID, address } = useWeb3Context();

  async function getAllData() {
    await dispatch(getAssetPrice({ networkID: chainID, provider }));
    await dispatch(getStakingInfo({ networkID: chainID, provider, address, value: QUANTITY }));
    await dispatch(getStakingRewardsInfo({ networkID: chainID, provider, address }));
    await dispatch(getTorPoolInfo({ networkID: chainID, provider, address }));
    await dispatch(getTorBalance({ networkID: chainID, provider, address }));
    await dispatch(getTorBalanceAmounts({ networkID: chainID, provider, address }));
    await dispatch(getDaiUsdcBalance({ networkID: chainID, provider, address }));
    await dispatch(getWftmBalance({ networkID: chainID, provider, address }));
    await dispatch(getTorWftmPool({ networkID: chainID, provider, address }));
    await dispatch(getTorWftmFarm({ networkID: chainID, provider, address }));
  }

  const [torStats, setTorStats] = useState<Stats>();
  const [wftmStats, setWftmStats] = useState<Stats>();
  async function updateStats() {
    if (!chainID || !provider || !address) {
      return;
    }
    const [tor, wftm] = await Promise.all([
      stakingGateway(chainID, provider).getStakingInfo("0x0000000000000000000000000000000000000000", 0),
      genericStakingGateway(provider).getStakingInfo(
        FANTOM.TOR_WFTM_FARM_REWARDS,
        FANTOM.TOR_WFTM_POOL_PRICER,
        FANTOM.TOR_WFTM_FARM_REWARD_PRICER,
        address,
      ),
    ]);
    if (tor) {
      console.log("tor", tor);
      setTorStats({
        apy: tor._apr,
        tvl: tor._tvl,
        earnedTokens: undefined,
        earnedUsd: undefined,
        stakedTokens: undefined,
        stakedUsd: undefined,
      });
    }
    if (wftm) {
      console.log("wftm", wftm);
      setWftmStats({
        apy: wftm._apr,
        tvl: wftm._tvl,
        earnedTokens: wftm._userEarnedAmount,
        earnedUsd: wftm._userEarnedValue,
        stakedTokens: wftm._userStakedAmount,
        stakedUsd: wftm._userStakedValue,
      });
    }
  }

  useEffect(() => {
    updateStats();
    if (chainID && provider && address) {
      getAllData();
    }
  }, [chainID, provider, address]);

  useEffect(() => {
    const updateInterval = setInterval(() => {
      if (address) {
        dispatch(getStakingInfo({ networkID: chainID, provider, address, value: QUANTITY }));
        dispatch(getTorBalance({ networkID: chainID, provider, address }));
      }
    }, 1000 * 60);
    return () => {
      clearInterval(updateInterval);
    };
  }, [address]);

  enum Farm {
    DaiTorUsdc = "dai-tor-usdc",
    TorWftm = "tor-wftm",
  }
  const [farm, setFarm] = useState(Farm.DaiTorUsdc);
  useEffect(() => {
    const lastFarm = localStorage.getItem("farm");
    if (lastFarm !== Farm.DaiTorUsdc && lastFarm !== Farm.TorWftm) {
      return;
    }
    setFarm(lastFarm);
  }, []);
  useEffect(() => {
    localStorage.setItem("farm", farm);
  }, [farm]);

  return (
    <>
      {HECTOR_ENV !== "prod" && (
        <div className="good-tabs">
          <Button className={farm === Farm.DaiTorUsdc ? "selected" : ""} onClick={() => setFarm(Farm.DaiTorUsdc)}>
            TOR LP
          </Button>
          <Button className={farm === Farm.TorWftm ? "selected" : ""} onClick={() => setFarm(Farm.TorWftm)}>
            wFTM LP
          </Button>
        </div>
      )}
      {farm === Farm.DaiTorUsdc && (
        <div className="pool-farming">
          <TorFarmingInfo stats={torStats} />
          <Wallet>
            <TokenBalance
              icon={<TorSVG style={{ height: "30px", width: "30px" }} />}
              name="TOR"
              address={FANTOM.TOR_ADDRESS}
              balance={torBalance?.balance ?? Zero}
              denomination="ether"
            />
            <TokenBalance
              icon={<img src={DaiToken} />}
              name="DAI"
              address={FANTOM.DAI_ADDRESS}
              balance={daiUsdcBalance?.dai ?? Zero}
              denomination="ether"
            />
            <TokenBalance
              icon={<img src={UsdcToken} />}
              name="USDC"
              address={FANTOM.USDC_ADDRESS}
              balance={daiUsdcBalance?.usdc ?? Zero}
              denomination="mwei"
            />
            <TokenBalance
              icon={<img src={curveToken} />}
              name="crvLP"
              address={FANTOM.DAI_TOR_USDC_POOL}
              balance={torPoolInfo?.balance ?? Zero}
              denomination="ether"
            />
          </Wallet>
          <Curve
            daiBalance={daiUsdcBalance?.dai ?? Zero}
            usdcBalance={daiUsdcBalance?.usdc ?? Zero}
            torBalance={torBalance?.balance ?? Zero}
            crvBalance={torPoolInfo?.balance ?? Zero}
            crvAllowance={torPoolInfo?.allowance ?? Zero}
          />
          <FarmStaking
            onAction={getAllData}
            onPoolApprove={() => dispatch(torPoolApprove({ networkID: chainID, provider, address }))}
            onStake={(value: BigNumber) => dispatch(stake({ networkID: chainID, provider, address, value }))}
            onUnstake={(value: BigNumber) => dispatch(unstake({ networkID: chainID, provider, address, value }))}
            onClaim={() => dispatch(claimRewards({ networkID: chainID, provider, address }))}
            poolTokenIcon={<img src={curveToken} />}
            poolTokenName="crvLP"
            poolTokenBalance={torPoolInfo?.balance ?? Zero}
            poolTokenAllowance={torPoolInfo?.allowance ?? Zero}
            farmTokenStakeBalance={stakingRewardsInfo?.balance ?? Zero}
            farmTokenRewardBalance={stakingInfo?._earnedRewardAmount ?? Zero}
            farmUsdRewardBalance={stakingInfo?._earnedRewardAmount.mul(assetPrice).div(1e8) ?? Zero}
            farmUsdStakeBalance={undefined}
            farmTokenRewardName="wFTM"
          />
        </div>
      )}
      {farm === Farm.TorWftm && (
        <div className="pool-farming">
          <WftmFarmingInfo stats={wftmStats} />
          <Wallet>
            <TokenBalance
              icon={<TorSVG style={{ height: "30px", width: "30px" }} />}
              name="TOR"
              address={FANTOM.TOR_ADDRESS}
              balance={torBalance?.balance ?? Zero}
              denomination="ether"
            />
            <TokenBalance
              icon={<WftmSvg style={{ height: "30px", width: "30px" }} />}
              name="wFTM"
              address={FANTOM.WFTM_ADDRESS}
              balance={wftmBalance?.balance ?? Zero}
              denomination="ether"
            />
            <TokenBalance
              icon={<SpookySwap style={{ height: "30px", width: "30px" }} />}
              name="spLP"
              address={FANTOM.TOR_WFTM_POOL}
              balance={torWftmPool?.balance ?? Zero}
              denomination="ether"
            />
          </Wallet>
          <FarmStaking
            onAction={getAllData}
            onPoolApprove={() => dispatch(torWftmPoolApprove({ networkID: chainID, provider, address }))}
            onStake={(value: BigNumber) => dispatch(stakeTorWftm({ networkID: chainID, provider, address, value }))}
            onUnstake={(value: BigNumber) => dispatch(unstakeTorWftm({ networkID: chainID, provider, address, value }))}
            onClaim={() => dispatch(claimTorWftm({ networkID: chainID, provider, address }))}
            poolTokenIcon={<SpookySwap style={{ height: "30px", width: "30px" }} />}
            poolTokenName="spLP"
            poolTokenBalance={torWftmPool?.balance ?? Zero}
            poolTokenAllowance={torWftmPool?.allowance ?? Zero}
            farmTokenStakeBalance={wftmStats?.stakedTokens ?? Zero}
            farmTokenRewardBalance={wftmStats?.earnedTokens ?? Zero}
            farmUsdRewardBalance={wftmStats?.earnedUsd ?? Zero}
            farmUsdStakeBalance={wftmStats?.stakedUsd ?? Zero}
            farmTokenRewardName="HEC"
          />

          <div className="curve-pool">
            <div
              className="MuiPaper-root hec-card curve"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                height: "100%",
                gap: "20px",
                justifyContent: "center",
              }}
            >
              <SpookySwap style={{ height: "128px", width: "128px", marginLeft: "auto", marginRight: "auto" }} />
              <Button
                style={{ flexGrow: 1 }}
                variant="contained"
                color="primary"
                target="_blank"
                href="https://spookyswap.finance/add/0x74E23dF9110Aa9eA0b6ff2fAEE01e740CA1c642e/0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83"
              >
                SpookySwap pool
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Wallet: FC = ({ children }) => (
  <div className="MuiPaper-root hec-card wallet">
    <div className="header">
      <div className="header-title">Balances</div>
    </div>
    {children}
  </div>
);

interface TokenBalanceProps {
  icon: ReactNode;
  name: string;
  address: string;
  balance: BigNumber;
  denomination: Denomination;
}

const TokenBalance: VFC<TokenBalanceProps> = ({ icon, name, balance, address, denomination }) => {
  const watchToken = useCallback(async () => {
    try {
      await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address,
            symbol: name,
            decimals: decimalsFromDenomination(denomination),
          },
        },
      });
    } catch (error) {
      console.log(error);
    }
  }, [address, name, denomination]);
  return (
    <div className="token">
      {icon}
      <div className="details">
        <div className="coin">{name} Balance</div>
        <div className="balance">{prettyEthersNumber(balance, denomination)}</div>
        <Tooltip title={`Track your ${name} balance in MetaMask`}>
          <button onClick={watchToken}>
            <AddToWallet />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

interface FarmStakingProps {
  onAction: () => void;
  onPoolApprove: () => void;
  onStake: (amount: BigNumber) => void;
  onUnstake: (amount: BigNumber) => void;
  onClaim: () => void;
  poolTokenIcon: ReactNode;
  poolTokenName: string;
  poolTokenBalance: BigNumber;
  poolTokenAllowance: BigNumber;
  farmTokenStakeBalance: BigNumber;
  farmUsdRewardBalance: BigNumber;
  farmUsdStakeBalance: BigNumber;
  farmTokenRewardBalance: BigNumber;
  farmTokenRewardName: string;
}

const FarmStaking: VFC<FarmStakingProps> = ({
  onAction,
  onPoolApprove,
  onStake,
  onUnstake,
  onClaim,
  poolTokenIcon,
  poolTokenName,
  poolTokenBalance,
  poolTokenAllowance,
  farmTokenStakeBalance,
  farmTokenRewardBalance,
  farmTokenRewardName,
  farmUsdRewardBalance,
  farmUsdStakeBalance,
}) => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state: RootState) => state.farm);
  const hasPoolAllowance = poolTokenAllowance.gt(poolTokenBalance);
  const hasPoolBalance = poolTokenBalance.gt(0);
  const [view, setView] = useState(0);
  const [stakeInput, setStakeInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");
  const stakeAmount = ethers.utils.parseEther(stakeInput || "0");
  const withdrawAmount = ethers.utils.parseEther(withdrawInput || "0");

  const setMax = () => {
    if (view === 0) {
      setStakeInput(ethers.utils.formatEther(poolTokenBalance));
    } else {
      setWithdrawInput(ethers.utils.formatEther(farmTokenStakeBalance));
    }
  };

  const onUserAction = async (action: UserAction) => {
    const value = view === 0 ? stakeAmount : withdrawAmount;
    if (!value.gt(0)) {
      return dispatch(error("Please enter a value greater than 0"));
    }
    if (action === "stake" && value.gt(poolTokenBalance)) {
      return dispatch(error("You cannot stake more than your balance."));
    }
    if (action === "unstake" && value.gt(farmTokenStakeBalance)) {
      return dispatch(error("You cannot withdraw more than your balance."));
    }
    switch (action) {
      case "stake":
        onStake(stakeAmount);
        break;
      case "unstake":
        onUnstake(withdrawAmount);
        break;
    }
    setStakeInput("");
    setWithdrawInput("");
    onAction();
  };

  const canStake =
    farmTokenStakeBalance.gt(Zero) || farmTokenRewardBalance.gt(Zero) || hasPoolBalance || hasPoolAllowance;

  return (
    <div className="MuiPaper-root hec-card farming">
      <div className="header">
        <div className="header-title">Earn Rewards</div>
        <HelpModal />
      </div>

      <div className="actions">
        {canStake && (
          <>
            <div className="tab-group">
              <Tabs
                className="tabs"
                textColor="primary"
                indicatorColor="primary"
                value={view}
                onChange={(_, view) => setView(view)}
                aria-label="simple tabs example"
              >
                <Tab label="Stake" {...a11yProps(0)} />
                <Tab label="Unstake" {...a11yProps(1)} />
              </Tabs>

              <TabPanel value={view} index={0}>
                {poolTokenIcon}

                <FormControl className="input-amount" fullWidth variant="outlined">
                  <InputLabel htmlFor="outlined-adornment-amount">Amount</InputLabel>
                  <OutlinedInput
                    id="outlined-adornment-amount"
                    type="number"
                    value={stakeInput}
                    onChange={e => setStakeInput(trimDecimalsPast(18, e.target.value))}
                    endAdornment={
                      <InputAdornment position="end">
                        {" "}
                        {hasPoolBalance && (
                          <Button variant="text" onClick={setMax} color="inherit">
                            Max
                          </Button>
                        )}
                      </InputAdornment>
                    }
                    labelWidth={60}
                  />
                </FormControl>
              </TabPanel>
              <TabPanel value={view} index={1}>
                {poolTokenIcon}

                <FormControl className="input-amount" fullWidth variant="outlined">
                  <InputLabel htmlFor="outlined-adornment-amount">Amount</InputLabel>
                  <OutlinedInput
                    id="outlined-adornment-amount"
                    type="number"
                    value={withdrawInput}
                    endAdornment={
                      <InputAdornment position="end">
                        {" "}
                        {farmTokenRewardBalance.gt(0) && (
                          <Button variant="text" onClick={setMax} color="inherit">
                            Max
                          </Button>
                        )}
                      </InputAdornment>
                    }
                    onChange={e => setWithdrawInput(trimDecimalsPast(18, e.target.value))}
                    labelWidth={60}
                  />
                </FormControl>
              </TabPanel>
            </div>
            <div className="info">
              <div>
                <div className="title">Staked {poolTokenName} Tokens:</div>
                <div className="data">
                  <>
                    {prettyEthersNumber(farmTokenStakeBalance)}{" "}
                    {farmUsdStakeBalance && `(${prettyEthersNumber(farmUsdStakeBalance)})`}
                  </>
                </div>
              </div>
              <div>
                <div className="title">{farmTokenRewardName} Rewards:</div>
                <div className="data">
                  {prettyEthersNumber(farmTokenRewardBalance)} (${prettyEthersNumber(farmUsdRewardBalance)})
                </div>
              </div>
              <div className="buttons">
                {
                  <Button
                    className="stake-button"
                    variant="contained"
                    color="primary"
                    disabled={farmTokenRewardBalance.lte(0) || isLoading}
                    onClick={onClaim}
                  >
                    Claim Rewards
                  </Button>
                }
                {hasPoolAllowance && view === 0 && (
                  <Button
                    className="stake-button"
                    variant="contained"
                    color="primary"
                    disabled={!hasPoolBalance || isLoading || stakeAmount.lte(0)}
                    onClick={() => onUserAction("stake")}
                  >
                    Stake
                  </Button>
                )}
                {hasPoolAllowance && view === 1 && (
                  <Button
                    className="stake-button"
                    variant="contained"
                    color="primary"
                    disabled={isLoading || farmTokenRewardBalance.lte(0) || withdrawAmount.lte(0)}
                    onClick={() => onUserAction("unstake")}
                  >
                    Withdraw
                  </Button>
                )}
                {!hasPoolAllowance && (
                  <Button
                    className="stake-button"
                    variant="contained"
                    color="primary"
                    disabled={isLoading}
                    onClick={onPoolApprove}
                  >
                    Approve
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {!canStake && (
          <>
            <div className="get-lp-text">
              <i>Deposit tokens into Curve in order to stake and earn rewards on your LP tokens.</i>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

interface TorFarmingInfoProps {
  stats: Stats;
}
const TorFarmingInfo: VFC<TorFarmingInfoProps> = ({ stats }) => {
  return (
    <div className="MuiPaper-root hec-card stats">
      <div className="header">
        <TorSVG style={{ height: "45px", width: "45px", marginRight: "10px" }} />
        <div className="tor-title">TOR LP</div>
      </div>
      <div>
        <div className="title">APR</div>
        <div className="data">
          {stats?.apy ? `${prettyEthersNumber(stats.apy, "mwei")}%` : <Skeleton width="50%" />}
        </div>
      </div>
      <div>
        <div className="title">TVL</div>
        <div className="data">{stats?.tvl ? `$${prettyEthersNumber(stats.tvl)}` : <Skeleton width="50%" />}</div>
      </div>
    </div>
  );
};

interface WftmPoolInfoProps {
  stats: Stats;
}
const WftmFarmingInfo: VFC<WftmPoolInfoProps> = ({ stats }) => {
  return (
    <div className="MuiPaper-root hec-card stats">
      <div className="header">
        <WftmSvg style={{ height: "45px", width: "45px", marginRight: "10px" }} />
        <div className="tor-title">wFTM LP</div>
      </div>
      <div>
        <div className="title">APR</div>
        <div className="data">
          {stats?.apy ? `${prettyEthersNumber(stats.apy, "mwei")}%` : <Skeleton width="50%" />}
        </div>
      </div>
      <div>
        <div className="title">TVL</div>
        <div className="data">{stats?.tvl ? `$${prettyEthersNumber(stats.tvl)}` : <Skeleton width="50%" />}</div>
      </div>
    </div>
  );
};

interface Stats {
  apy?: BigNumber;
  tvl?: BigNumber;
  stakedTokens: BigNumber;
  stakedUsd: BigNumber;
  earnedTokens: BigNumber;
  earnedUsd: BigNumber;
}

interface CurveProps {
  torBalance: BigNumber;
  daiBalance: BigNumber;
  usdcBalance: BigNumber;
  crvBalance: BigNumber;
  crvAllowance: BigNumber;
}

const Curve: VFC<CurveProps> = ({ torBalance, daiBalance, usdcBalance, crvBalance, crvAllowance }) => {
  const dispatch = useDispatch();
  const [view, setView] = useState<0 | 1>(0);
  const [daiInput, setDaiInput] = useState("");
  const [usdcInput, setUsdcInput] = useState("");
  const [torInput, setTorInput] = useState("");
  const tor = ethers.utils.parseEther(torInput || "0");
  const usdc = ethers.utils.parseUnits(usdcInput || "0", "mwei");
  const dai = ethers.utils.parseEther(daiInput || "0");
  const { provider, chainID, address, connected } = useWeb3Context();
  const [keepProportion, setKeepProportion] = useState(false);
  const [radioValue, setRadioValue] = useState<PoolToken>("TOR");
  const { curveAllowance, isLoading, curveProportions, stakingInfo } = useSelector((state: RootState) => state.farm);
  const optimalCoin = useMemo<PoolToken>(() => {
    if (!connected || !stakingInfo) {
      return undefined;
    }
    const tokens: { amount: BigNumber; symbol: PoolToken }[] = [
      { amount: stakingInfo._optimalHugsAmount, symbol: "TOR" },
      { amount: stakingInfo._optimalDaiAmount, symbol: "DAI" },
      { amount: stakingInfo._optimalUsdcAmount, symbol: "USDC" },
    ];
    const optimalIndex = tokens.reduce((max, token, i) => (token.amount.gt(tokens[max].amount) ? i : max), 0);
    return tokens[optimalIndex].symbol;
  }, [stakingInfo, connected]);

  const hasAnyBalance = dai.gt(0) || usdc.gt(0) || tor.gt(0);
  const hasDaiDepositAllowance = curveAllowance?.daiAllowance.gt(0) ?? false;
  const hasUsdcDepositAllowance = curveAllowance?.usdcAllowance.gt(0) ?? false;
  const hasTorDepositAllowance = curveAllowance?.torAllowance.gt(0) ?? false;
  const hasPoolAllowance = curveAllowance?.torPoolAllowance.gt(0) ?? false;

  const daiCurveApporve = () => {
    dispatch(
      curveDaiApprove({
        networkID: chainID,
        provider,
        address,
      }),
    );
  };
  const usdcCurveApporve = () => {
    dispatch(
      curveUsdcApprove({
        networkID: chainID,
        provider,
        address,
      }),
    );
  };

  const torCurveApprove = () => {
    dispatch(
      curveTorApprove({
        networkID: chainID,
        provider,
        address,
      }),
    );
  };

  const approveCurveWithdraw = () => {
    dispatch(curveWithdrawApprove({ networkID: chainID, provider, address }));
  };

  const isTorFormInvalid = () => {
    switch (view) {
      case 0:
        return torBalance.lt(tor);
      case 1:
        return crvBalance.lt(tor);
    }
  };
  const isDaiFormInvalid = () => {
    if (daiInput === "") {
      return false;
    }
    switch (view) {
      case 0:
        return daiBalance.lt(dai);
      case 1:
        return crvBalance.lt(dai);
    }
  };
  const isUsdcFormInvalid = () => {
    if (usdcInput === "") {
      return false;
    }
    switch (view) {
      case 0:
        return usdcBalance.lt(usdc);
      case 1:
        return crvBalance.lt(usdc);
    }
  };

  const onDeposit = () => {
    dispatch(
      depositCurveTokens({
        networkID: chainID,
        provider,
        address,
        torAmount: tor,
        daiAmount: dai,
        usdcAmount: usdc,
        onComplete: () => {
          setTorInput("");
          setDaiInput("");
          setUsdcInput("");
        },
      }),
    );
  };

  const onWithdraw = () => {
    dispatch(
      withdrawCurveTokens({
        networkID: chainID,
        provider,
        address,
        lpBalance: crvBalance,
        torAmount: tor,
        daiAmount: dai,
        usdcAmount: usdc,
        onComplete: () => {
          setTorInput("");
          setDaiInput("");
          setUsdcInput("");
        },
      }),
    );
  };

  const onWithdrawOneToken = () => {
    let coin: 0 | 1 | 2;
    if (radioValue === "TOR") {
      coin = 0;
    } else if (radioValue === "DAI") {
      coin = 1;
    } else if (radioValue === "USDC") {
      coin = 2;
    }
    dispatch(
      withdrawOneCurveTokens({
        networkID: chainID,
        provider,
        address,
        lpBalance: crvBalance,
        coin,
      }),
    );
  };

  const proportionalToTor = (tor: BigNumber) => ({
    usdc: tor.mul(curveProportions.usdc).div(curveProportions.tor),
    dai: tor.mul(curveProportions.dai).div(curveProportions.tor),
  });
  const proportionalToDai = (dai: BigNumber) => ({
    usdc: dai.mul(curveProportions.usdc).div(curveProportions.dai),
    tor: dai.mul(curveProportions.tor).div(curveProportions.dai),
  });
  const proportionalToUsdc = (usdc: BigNumber) => ({
    dai: usdc.mul(curveProportions.dai).div(curveProportions.usdc),
    tor: usdc.mul(curveProportions.tor).div(curveProportions.usdc),
  });

  const maxProportionalTor = (): boolean => {
    const { usdc, dai } = proportionalToTor(torBalance);
    if (usdc.gt(usdcBalance.mul(MWEI_PER_ETHER)) || dai.gt(daiBalance)) {
      return false;
    }
    setTorInput(ethers.utils.formatEther(torBalance));
    setDaiInput(ethers.utils.formatEther(dai));
    setUsdcInput(trimDecimalsPast(6, ethers.utils.formatEther(usdc)));
    return true;
  };

  const maxProportionalDai = (): boolean => {
    const { tor, usdc } = proportionalToDai(daiBalance);
    if (tor.gt(torBalance) || usdc.gt(usdcBalance.mul(MWEI_PER_ETHER))) {
      return false;
    }
    setTorInput(ethers.utils.formatEther(tor));
    setDaiInput(ethers.utils.formatEther(daiBalance));
    setUsdcInput(trimDecimalsPast(6, ethers.utils.formatEther(usdc)));
    return true;
  };

  const maxProportionalUsdc = (): boolean => {
    const { tor, dai } = proportionalToUsdc(usdcBalance.mul(MWEI_PER_ETHER));
    if (tor.gt(torBalance) || dai.gt(daiBalance)) {
      return false;
    }
    setTorInput(ethers.utils.formatEther(tor));
    setDaiInput(ethers.utils.formatEther(dai));
    setUsdcInput(ethers.utils.formatUnits(usdcBalance, "mwei"));
    return true;
  };

  const max = (token: PoolToken) => {
    if (keepProportion) {
      const tokens: [BigNumber, () => boolean][] = [
        [torBalance, maxProportionalTor],
        [usdcBalance, maxProportionalUsdc],
        [daiBalance, maxProportionalDai],
      ];
      tokens.sort(([a], [b]) => (a.gt(b) ? -1 : 1));
      for (const [_, tryMax] of tokens) {
        if (tryMax()) {
          break;
        }
      }
    } else {
      switch (token) {
        case "DAI":
          setDaiInput(ethers.utils.formatEther(daiBalance));
          break;
        case "USDC":
          setUsdcInput(ethers.utils.formatUnits(usdcBalance, "mwei"));
          break;
        case "TOR":
          setTorInput(ethers.utils.formatEther(torBalance));
          break;
      }
    }
  };

  useEffect(() => {
    if (view !== 1 || !curveProportions || !crvBalance) {
      return;
    }
    if (keepProportion) {
      const ONE = ethers.utils.parseEther("1");
      setTorInput(ethers.utils.formatEther(crvBalance.mul(curveProportions.tor).div(ONE)));
      setDaiInput(ethers.utils.formatEther(crvBalance.mul(curveProportions.dai).div(ONE)));
      setUsdcInput(trimDecimalsPast(6, ethers.utils.formatEther(crvBalance.mul(curveProportions.usdc).div(ONE))));
    } else {
      setDaiInput("0.0");
      setUsdcInput("0.0");
      setTorInput("0.0");
      switch (radioValue) {
        case "TOR":
          setTorInput(ethers.utils.formatEther(crvBalance));
          break;
        case "USDC":
          setUsdcInput(trimDecimalsPast(6, ethers.utils.formatEther(crvBalance)));
          break;
        case "DAI":
          setDaiInput(ethers.utils.formatEther(crvBalance));
          break;
      }
    }
  }, [view, curveProportions, radioValue, crvBalance, keepProportion]);

  useEffect(() => {
    if (view !== 0) {
      return;
    }
    setTorInput("");
    setUsdcInput("");
    setDaiInput("");
  }, [view]);

  useEffect(() => {
    if (chainID && provider && address) {
      dispatch(
        getCurveAllowance({
          networkID: chainID,
          provider,
          address,
        }),
      );
    }
  }, [chainID, provider, address]);

  return (
    <div className="curve-pool">
      <div className="MuiPaper-root hec-card curve">
        <div className="header">
          <div className="header-title">Curve</div>
          <div className="link">
            <Link className="lp-link" target="_blank" href="https://ftm.curve.fi/factory/62/deposit">
              <SvgIcon component={ArrowUp} htmlColor="#A3A3A3" />
            </Link>
          </div>
          {/* <Button
            variant="text"
            color="primary"
            onClick={max}
            style={{ display: view === 0 ? "" : "none" }}
            className="max-amt"
          >
            Max
          </Button> */}
          <FormControlLabel
            className={!keepProportion ? "slider-off slider" : "slider"}
            control={
              <Switch
                checked={keepProportion}
                onChange={() => setKeepProportion(!keepProportion)}
                name="sliderState"
                color="primary"
              />
            }
            label={"Combo"}
          />
        </div>
        <div className="tab-group">
          <Tabs
            className="tabs"
            textColor="primary"
            indicatorColor="primary"
            value={view}
            onChange={(_, value) => setView(value)}
            aria-label="simple tabs example"
          >
            <Tab label="Deposit" {...curveInputProps(0)} />
            <Tab label="Withdraw" {...curveInputProps(1)} />
          </Tabs>
          <div className="token-inputs">
            <div className="token">
              <TorSVG className="token-logo" />
              {(hasTorDepositAllowance || view === 1) && (
                <FormControl className="input-amount" fullWidth variant="outlined">
                  <InputLabel htmlFor="outlined-adornment-amount">TOR</InputLabel>
                  <OutlinedInput
                    error={isTorFormInvalid()}
                    type="number"
                    disabled={view === 1}
                    value={torInput}
                    onChange={e => {
                      const input = trimDecimalsPast(18, e.target.value);
                      setTorInput(input);
                      if (keepProportion) {
                        const { usdc, dai } = proportionalToTor(ethers.utils.parseEther(input || "0"));
                        setUsdcInput(trimDecimalsPast(6, ethers.utils.formatEther(usdc)));
                        setDaiInput(ethers.utils.formatEther(dai));
                      }
                    }}
                    endAdornment={
                      !keepProportion &&
                      view === 0 && (
                        <InputAdornment position="end">
                          <Button variant="text" onClick={() => max("TOR")} color="inherit">
                            Max
                          </Button>
                        </InputAdornment>
                      )
                    }
                    labelWidth={30}
                  />
                  {isTorFormInvalid() && <FormHelperText error>Must be less than or equal to balance!</FormHelperText>}
                </FormControl>
              )}

              {!hasTorDepositAllowance && view !== 1 && (
                <Button
                  className="stake-button"
                  variant="contained"
                  color="primary"
                  disabled={isLoading}
                  onClick={() => torCurveApprove()}
                >
                  Approve
                </Button>
              )}
              <Tooltip
                title={`Depositing TOR will get you the most LP`}
                className={optimalCoin === "TOR" && view === 0 ? "optimal visible" : "optimal"}
              >
                <BestFarmIcon />
              </Tooltip>
            </div>
            <div className="token">
              <img src={DaiToken} className="token-logo" />
              {(hasDaiDepositAllowance || view === 1) && (
                <FormControl className="input-amount" fullWidth variant="outlined">
                  <InputLabel htmlFor="outlined-dai-amount">DAI</InputLabel>
                  <OutlinedInput
                    error={isDaiFormInvalid()}
                    type="number"
                    disabled={view === 1}
                    value={daiInput}
                    onChange={e => {
                      const input = trimDecimalsPast(18, e.target.value);
                      setDaiInput(input);
                      if (keepProportion) {
                        const { usdc, tor } = proportionalToDai(ethers.utils.parseEther(input || "0"));
                        setUsdcInput(trimDecimalsPast(6, ethers.utils.formatEther(usdc)));
                        setTorInput(ethers.utils.formatEther(tor));
                      }
                    }}
                    endAdornment={
                      !keepProportion &&
                      view === 0 && (
                        <InputAdornment position="end">
                          <Button variant="text" onClick={() => max("DAI")} color="inherit">
                            Max
                          </Button>
                        </InputAdornment>
                      )
                    }
                    labelWidth={27}
                  />
                  {isDaiFormInvalid() && <FormHelperText error>Must be less than or equal to balance!</FormHelperText>}
                </FormControl>
              )}

              {!hasDaiDepositAllowance && view !== 1 && (
                <Button
                  className="stake-button"
                  variant="contained"
                  color="primary"
                  disabled={isLoading}
                  onClick={() => daiCurveApporve()}
                >
                  Approve
                </Button>
              )}
              <Tooltip
                title={`Depositing DAI will get you the most LP`}
                className={optimalCoin === "DAI" && view === 0 ? "optimal visible" : "optimal"}
              >
                <BestFarmIcon />
              </Tooltip>
            </div>
            <div className="token">
              <img src={UsdcToken} className="token-logo" />
              {(hasUsdcDepositAllowance || view === 1) && (
                <FormControl className="input-amount" fullWidth variant="outlined">
                  <InputLabel htmlFor="outlined-adornment-amount">USDC</InputLabel>
                  <OutlinedInput
                    error={isUsdcFormInvalid()}
                    type="number"
                    disabled={view === 1}
                    value={usdcInput}
                    onChange={e => {
                      const input = trimDecimalsPast(6, e.target.value);
                      setUsdcInput(input);
                      if (keepProportion) {
                        const { dai, tor } = proportionalToUsdc(ethers.utils.parseEther(input || "0"));
                        setDaiInput(ethers.utils.formatEther(dai));
                        setTorInput(ethers.utils.formatEther(tor));
                      }
                    }}
                    endAdornment={
                      !keepProportion &&
                      view === 0 && (
                        <InputAdornment position="end">
                          <Button variant="text" onClick={() => max("USDC")} color="inherit">
                            Max
                          </Button>
                        </InputAdornment>
                      )
                    }
                    labelWidth={40}
                  />
                  {isUsdcFormInvalid() && <FormHelperText error>Must be less than or equal to balance!</FormHelperText>}
                </FormControl>
              )}

              {!hasUsdcDepositAllowance && view !== 1 && (
                <Button
                  className="stake-button"
                  variant="contained"
                  color="primary"
                  disabled={isLoading}
                  onClick={() => usdcCurveApporve()}
                >
                  Approve
                </Button>
              )}
              <Tooltip
                title={`Depositing USDC will get you the most LP`}
                className={optimalCoin === "USDC" && view === 0 ? "optimal visible" : "optimal"}
              >
                <BestFarmIcon />
              </Tooltip>
            </div>
          </div>
          <TabPanel value={view} index={0}>
            <Tooltip
              title={
                hasDaiDepositAllowance && hasUsdcDepositAllowance && hasTorDepositAllowance
                  ? ""
                  : "Please approve remaining tokens before depositing"
              }
            >
              <span>
                <Button
                  disabled={
                    isLoading ||
                    isUsdcFormInvalid() ||
                    isDaiFormInvalid() ||
                    isTorFormInvalid() ||
                    !hasAnyBalance ||
                    !hasDaiDepositAllowance ||
                    !hasUsdcDepositAllowance ||
                    !hasTorDepositAllowance
                  }
                  className="stake-button"
                  variant="contained"
                  color="primary"
                  onClick={() => onDeposit()}
                >
                  Deposit
                </Button>
              </span>
            </Tooltip>
          </TabPanel>
          {view === 1 && !keepProportion && (
            <RadioGroup className="radio-group" aria-label="tokens" name="tokens" value={radioValue}>
              <FormControlLabel
                value="TOR"
                control={<Radio />}
                label="TOR"
                onChange={(e, checked) => {
                  if (checked) {
                    setRadioValue("TOR");
                  }
                }}
              />
              <FormControlLabel
                value="DAI"
                control={<Radio />}
                label="DAI"
                onChange={(e, checked) => {
                  if (checked) {
                    setRadioValue("DAI");
                  }
                }}
              />
              <FormControlLabel
                value="USDC"
                control={<Radio />}
                label="USDC"
                onChange={(e, checked) => {
                  if (checked) {
                    setRadioValue("USDC");
                  }
                }}
              />
            </RadioGroup>
          )}
          <TabPanel value={view} index={1}>
            {hasPoolAllowance && (
              <Button
                onClick={() => (keepProportion ? onWithdraw() : onWithdrawOneToken())}
                className="stake-button"
                disabled={!hasAnyBalance || isLoading}
                variant="contained"
                color="primary"
              >
                Withdraw
              </Button>
            )}
            {!hasPoolAllowance && (
              <Button
                className="stake-button"
                variant="contained"
                color="primary"
                disabled={isLoading}
                onClick={() => approveCurveWithdraw()}
              >
                Approve
              </Button>
            )}
          </TabPanel>
        </div>
      </div>
    </div>
  );
};

const HelpModal: VFC = () => {
  const [open, setOpen] = useState(false);
  const [theme] = useTheme();

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };
  return (
    <>
      <IconButton onClick={handleOpen} className="help">
        <HelpOutlineIcon />
      </IconButton>

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
      >
        <div className="modal ">
          <IconButton onClick={handleClose}>
            <CancelIcon />
          </IconButton>
          <img src={theme === "dark" ? farmingInfoDark : farmingInfoLight} />
        </div>
      </Modal>
    </>
  );
};
