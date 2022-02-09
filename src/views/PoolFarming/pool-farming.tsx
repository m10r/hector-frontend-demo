import "./pool-farming.scss";
import { useCallback, useEffect, useState } from "react";

import { BigNumber, ethers } from "ethers";
import {
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
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
  approve,
  claimRewards,
  depositCurveTokens,
  getAssetPrice,
  getTorPoolInfo,
  getStakingInfo,
  getStakingRewardsInfo,
  getTorBalanceAmounts,
  getTorBalance,
  stake,
  withdrawCurveTokens,
  withDrawStaked,
  getDaiUsdcBalance,
  DaiUsdcBalance,
  withdrawOneCurveTokens,
  getCurveAllowance,
  curveDaiApprove,
  curveUsdcApprove,
  curveTorApprove,
  curveWithdrawApprove,
} from "src/slices/FarmSlice";
import { ReactComponent as ArrowUp } from "../../assets/icons/arrow-up.svg";
import { CurveProportions, StakingInfo, TorBalance, TorPoolInfo } from "src/types/farming.model";
import { Skeleton } from "@material-ui/lab";
import { ReactComponent as TorSVG } from "../../assets/tokens/TOR.svg";
import TabPanel from "src/components/TabPanel";
import { error } from "src/slices/MessagesSlice";
import DaiToken from "../../assets/tokens/DAI.svg";
import UsdcToken from "../../assets/tokens/USDC.svg";
import wFTMToken from "../../assets/tokens/wFTM.png";
import curveToken from "../../assets/tokens/curve.png";
import farmingInfoDark from "../../assets/Farming-info-dark.png";
import farmingInfoLight from "../../assets/Farming-info-light.png";
import HelpOutlineIcon from "@material-ui/icons/HelpOutline";
import CancelIcon from "@material-ui/icons/Cancel";
import { formatCurrency, trim } from "src/helpers";
import MonetizationOnOutlinedIcon from "@material-ui/icons/MonetizationOnOutlined";

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

const getFormattedStakingInfo = (prop: keyof StakingInfo, stakingInfo: StakingInfo, units?: ethers.BigNumberish) =>
  stakingInfo ? +ethers.utils.formatUnits(stakingInfo[prop], units) : 0;

export default function PoolFarming({ theme, themeMode }: any) {
  const dispatch = useDispatch();
  const {
    assetPrice,
    stakingRewardsInfo,
    torPoolInfo,
    torBalance,
    stakingInfo,
    curveProportions,
    daiUsdcBalance,
    isLoading,
  } = useSelector((state: RootState) => state.farm);
  const [quantity, setQuantity] = useState("");
  const [stakeQuantity, setStakeQuantity] = useState("");
  const [withdrawQuantity, setWtihdrawQuantity] = useState("");

  const [calcQuantity, setCalcQuantity] = useState(0);
  const [view, setView] = useState(0);
  const { provider, chainID, address } = useWeb3Context();

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setView(newValue);
  };
  const hasAllowance = useCallback(() => {
    return torPoolInfo?.allowance < torPoolInfo?.balance;
  }, [torPoolInfo]);

  const hasLpBalance = useCallback(() => torPoolInfo?.balance > 0 && torPoolInfo?.allowance > torPoolInfo?.balance, [
    torPoolInfo,
  ]);

  const setMax = () => {
    if (view === 0) {
      setStakeQuantity(ethers.utils.formatEther(torPoolInfo.originalBalance));
    } else {
      setWtihdrawQuantity(ethers.utils.formatEther(stakingRewardsInfo.originalBalance));
    }
  };

  const getEarnedUsd = useCallback(() => {
    if (stakingInfo && assetPrice) {
      const earnedUSD = +ethers.utils.formatEther(stakingInfo?._earnedRewardAmount);
      const assetPriceUSD = assetPrice.toNumber() / 1e8;
      return (earnedUSD * assetPriceUSD).toFixed(2);
    }
  }, [stakingInfo, assetPrice]);

  async function dispatchStakingInfo(): Promise<void> {
    await dispatch(getStakingInfo({ networkID: chainID, provider, address, value: quantity }));
    setCalcQuantity(+quantity);
  }
  async function dispatchClaimEarned(): Promise<void> {
    await dispatch(claimRewards({ networkID: chainID, provider, address }));
    dispatchStakingInfo();
  }

  const onUserAction = async (action: UserAction) => {
    let value: string;
    view === 0 ? (value = stakeQuantity) : (value = withdrawQuantity);

    if (value === "0" || value === "0.0") {
      return dispatch(error("Please enter a value greater than 0"));
    }

    if (action === "stake" && +value > +ethers.utils.formatEther(torPoolInfo.originalBalance)) {
      return dispatch(error("You cannot stake more than your balance."));
    }
    if (action === "unstake" && +value > +ethers.utils.formatEther(stakingRewardsInfo.originalBalance)) {
      return dispatch(error("You cannot withdraw more than your balance."));
    }
    switch (action) {
      case "stake":
        await dispatch(stake({ networkID: chainID, provider, address, value: stakeQuantity }));
        break;
      case "unstake":
        await dispatch(withDrawStaked({ networkID: chainID, provider, address, value: withdrawQuantity }));
        break;
      case "approve":
        await dispatch(approve({ networkID: chainID, provider, address }));
        break;
    }
    getAllData();
    setStakeQuantity("");
    setWtihdrawQuantity("");
  };

  async function getAllData() {
    await dispatch(getAssetPrice({ networkID: chainID, provider }));
    await dispatch(getStakingInfo({ networkID: chainID, provider, address, value: "0" }));
    await dispatch(getStakingRewardsInfo({ networkID: chainID, provider, address }));
    await dispatch(getTorPoolInfo({ networkID: chainID, provider, address }));
    await dispatch(getTorBalance({ networkID: chainID, provider, address }));
    await dispatch(getTorBalanceAmounts({ networkID: chainID, provider, address }));
    await dispatch(getDaiUsdcBalance({ networkID: chainID, provider, address }));
  }

  useEffect(() => {
    if (chainID && provider && address) {
      getAllData();
    }
  }, [chainID, provider, address]);

  useEffect(() => {
    const updateInterval = setInterval(() => {
      if (address) {
        dispatch(getStakingInfo({ networkID: chainID, provider, address, value: "0" }));
        dispatch(getTorBalance({ networkID: chainID, provider, address }));
      }
    }, 1000 * 60);
    return () => {
      clearInterval(updateInterval);
    };
  }, [address]);

  return (
    <div className="pool-farming">
      <FarmStats stakingInfo={stakingInfo} />
      <div className="MuiPaper-root hec-card wallet">
        <div className="header">
          <div className="header-title">Balances</div>
        </div>
        <div className="token">
          <TorSVG style={{ height: "30px", width: "30px" }} />
          <div className="details">
            <div>TOR Balance</div>
            <div className="balance">{trim(torBalance?.balance, 4)}</div>
          </div>
        </div>
        <hr />
        <div className="token">
          <img src={DaiToken} />
          <div className="details">
            <div>DAI Balance</div>
            <div className="balance">{trim(daiUsdcBalance?.daiBalance, 4)}</div>
          </div>
        </div>
        <hr />

        <div className="token">
          <img src={UsdcToken} />
          <div className="details">
            <div>USDC Balance</div>
            <div className="balance">{trim(daiUsdcBalance?.usdcBalance, 4)}</div>
          </div>
        </div>
        <hr />

        <div className="token">
          <img src={curveToken} />
          <div className="details">
            <div>LP Balance</div>
            <div className="balance">{trim(torPoolInfo?.balance, 4)}</div>
          </div>
        </div>
      </div>
      <div className="MuiPaper-root hec-card farming">
        <div className="header">
          <div className="header-title">Earn Rewards</div>
          <HelpModal theme={theme} />
        </div>

        <div className="actions">
          {+getFormattedStakingInfo("_earnedRewardAmount", stakingInfo, "ether") > 0 ||
          hasLpBalance() ||
          hasAllowance() ||
          stakingRewardsInfo?.balance > 0 ? (
            <>
              <div className="tab-group">
                <Tabs
                  className="tabs"
                  textColor="primary"
                  indicatorColor="primary"
                  value={view}
                  onChange={handleChange}
                  aria-label="simple tabs example"
                >
                  <Tab label="Stake" {...a11yProps(0)} />
                  <Tab label="Unstake" {...a11yProps(1)} />
                </Tabs>

                <TabPanel value={view} index={0}>
                  <FormControl className="input-amount" fullWidth variant="outlined">
                    <InputLabel htmlFor="outlined-adornment-amount">Amount</InputLabel>
                    <OutlinedInput
                      id="outlined-adornment-amount"
                      type="number"
                      value={stakeQuantity}
                      onChange={e => setStakeQuantity(e.target.value)}
                      endAdornment={
                        <InputAdornment position="end">
                          {" "}
                          {hasLpBalance() && (
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
                  <FormControl className="input-amount" fullWidth variant="outlined">
                    <InputLabel htmlFor="outlined-adornment-amount">Amount</InputLabel>
                    <OutlinedInput
                      id="outlined-adornment-amount"
                      type="number"
                      value={withdrawQuantity}
                      endAdornment={
                        <InputAdornment position="end">
                          {" "}
                          {stakingRewardsInfo?.balance > 0 && (
                            <Button variant="text" onClick={setMax} color="inherit">
                              Max
                            </Button>
                          )}
                        </InputAdornment>
                      }
                      onChange={e => setWtihdrawQuantity(e.target.value)}
                      labelWidth={60}
                    />
                  </FormControl>
                </TabPanel>
              </div>
              <div className="info">
                <div>
                  <div className="title">Staked LP Tokens: </div>
                  <div className="data">
                    {stakingRewardsInfo?.balance || stakingRewardsInfo?.balance == 0 ? (
                      stakingRewardsInfo?.balance.toFixed(2)
                    ) : (
                      <Skeleton width="40%" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="title">wFTM Rewards: </div>
                  <div className="data">
                    {trim(getFormattedStakingInfo("_earnedRewardAmount", stakingInfo, "ether"), 4)}
                  </div>
                </div>
                <div className="buttons">
                  {+getFormattedStakingInfo("_earnedRewardAmount", stakingInfo, "ether") > 0 && (
                    <>
                      <Button
                        className="stake-button"
                        variant="contained"
                        color="primary"
                        disabled={isLoading}
                        onClick={() => dispatchClaimEarned()}
                      >
                        Claim Rewards
                      </Button>
                    </>
                  )}
                  {view === 0 && (
                    <Button
                      className="stake-button"
                      variant="contained"
                      color="primary"
                      disabled={!hasLpBalance() || isLoading || +stakeQuantity === 0}
                      onClick={() => onUserAction("stake")}
                    >
                      Stake
                    </Button>
                  )}
                  {view === 1 && (
                    <>
                      <Button
                        className="stake-button"
                        variant="contained"
                        color="primary"
                        disabled={isLoading || !(stakingRewardsInfo?.balance > 0) || +withdrawQuantity === 0}
                        onClick={() => onUserAction("unstake")}
                      >
                        Withdraw
                      </Button>
                    </>
                  )}
                  {hasAllowance() && (
                    <Button
                      className="stake-button"
                      variant="contained"
                      color="primary"
                      disabled={isLoading}
                      onClick={() => onUserAction("approve")}
                    >
                      Approve
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="get-lp-text">
                <i>Get LP tokens in order to stake and earn rewards on your LP.</i>
              </div>
              <Button
                className="stake-button"
                variant="contained"
                color="primary"
                disabled={isLoading}
                target="_blank"
                href="https://ftm.curve.fi/factory/62/deposit"
              >
                Get LP
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="curve-pool">
        <Curve
          daiUsdcBalance={daiUsdcBalance}
          torBalance={torBalance}
          curveProportions={curveProportions}
          torPoolInfo={torPoolInfo}
        />
      </div>
    </div>
  );
}

interface FarmStats {
  stakingInfo: StakingInfo;
}
const FarmStats = ({ stakingInfo }: FarmStats) => {
  return (
    <div className="MuiPaper-root hec-card stats">
      <div className="header">
        <TorSVG style={{ height: "45px", width: "45px", marginRight: "10px" }} />
        <div className="tor-title">TOR</div>
      </div>
      <div>
        <div className="title">APY</div>
        <div className="data">
          {stakingInfo ? getFormattedStakingInfo("_apr", stakingInfo, "mwei").toFixed(2) : <Skeleton width="50%" />}%
        </div>
      </div>
      <div>
        <div className="title">TVL</div>
        <div className="data">
          {stakingInfo ? (
            formatCurrency(getFormattedStakingInfo("_tvl", stakingInfo, "ether"), 2)
          ) : (
            <Skeleton width="50%" />
          )}
        </div>
      </div>
    </div>
  );
};

interface TokenBalances {
  daiUsdcBalance: DaiUsdcBalance;
  torBalance: TorBalance;
  curveProportions: CurveProportions;
  torPoolInfo: TorPoolInfo;
}

type Tokens = "DAI" | "TOR" | "USDC";

const Curve = ({ daiUsdcBalance, torBalance, curveProportions, torPoolInfo }: TokenBalances) => {
  const dispatch = useDispatch();
  const [view, setView] = useState(0);
  const [daiAmount, setDAIAmount] = useState("");
  const [usdcAmount, setUSDCAmount] = useState("");
  const [torAmount, setTORAmount] = useState("");
  const { provider, chainID, address } = useWeb3Context();
  const [sliderState, setSliderState] = useState(true);
  const [radioValue, setRadioValue] = useState<Tokens>("TOR");
  const { curveAllowance, isLoading } = useSelector((state: RootState) => state.farm);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const token = (event.target as HTMLInputElement).value as Tokens;
    setRadioValue(token);
    setMax(token);
  };

  const changeTabs = (event: React.ChangeEvent<{}>, newValue: number) => {
    setView(newValue);
  };

  const setMax = (token: Tokens): void => {
    if (view === 1 && !sliderState) {
      if (token === "DAI") {
        setDAIAmount(trim(torPoolInfo?.balance, 2));
        setUSDCAmount("0");
        setTORAmount("0");
      } else if (token === "USDC") {
        setUSDCAmount(trim(torPoolInfo?.balance, 2));
        setDAIAmount("0");
        setTORAmount("0");
      } else {
        setTORAmount(trim(torPoolInfo?.balance, 2));
        setDAIAmount("0");
        setUSDCAmount("0");
      }
    } else {
      if (token === "DAI") {
        setDAIAmount(trim(daiUsdcBalance?.daiBalance, 2));
      } else if (token === "USDC") {
        setUSDCAmount(trim(daiUsdcBalance?.usdcBalance, 2));
      } else {
        setTORAmount(trim(torBalance?.balance, 2));
      }
    }
  };

  const hasAnyBalance = () => +daiAmount > 0 || +usdcAmount > 0 || +torAmount > 0;

  const hasDaiDepositAllowance = useCallback(() => {
    return curveAllowance?.daiAllowance > BigNumber.from("0");
  }, [curveAllowance, daiUsdcBalance]);
  const hasUsdcDepositAllowance = useCallback(() => {
    return curveAllowance?.usdcAllowance > BigNumber.from("0");
  }, [curveAllowance, daiUsdcBalance]);
  const hasTorDepositAllowance = useCallback(() => {
    return curveAllowance?.torAllowance > BigNumber.from("0");
  }, [curveAllowance, torBalance]);
  const hasPoolAllowance = useCallback(() => {
    return curveAllowance?.torPoolAllowance > BigNumber.from("0");
  }, [torPoolInfo]);

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
    if (view === 0 && +trim(torBalance?.balance, 2) < +torAmount) {
      return true;
    } else if (view === 0 && +trim(torBalance?.balance, 2) > +torAmount) {
      return false;
    } else if (view === 1 && torPoolInfo?.balance < +torAmount) {
      return true;
    } else {
      return false;
    }
  };
  const isDaiFormInvalid = () => {
    if (view === 0 && daiUsdcBalance?.daiBalance < +daiAmount) {
      return true;
    } else if (view === 0 && daiUsdcBalance?.daiBalance > +daiAmount) {
      return false;
    } else if (view === 1 && torPoolInfo?.balance < +daiAmount) {
      return true;
    } else {
      return false;
    }
  };
  const isUsdcFormInvalid = () => {
    if (view === 0 && daiUsdcBalance?.usdcBalance < +usdcAmount) {
      return true;
    } else if (view === 0 && daiUsdcBalance?.usdcBalance > +usdcAmount) {
      return false;
    } else if (view === 1 && torPoolInfo?.balance < +usdcAmount) {
      return true;
    } else {
      return false;
    }
  };

  const onDeposit = () => {
    dispatch(depositCurveTokens({ networkID: chainID, provider, address, torAmount, daiAmount, usdcAmount }));
  };

  const onWithdraw = () => {
    dispatch(
      withdrawCurveTokens({
        networkID: chainID,
        provider,
        address,
        lpBalance: torPoolInfo.originalBalance,
        torAmount,
        daiAmount,
        usdcAmount,
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
        lpBalance: torPoolInfo.originalBalance,
        coin,
      }),
    );
  };

  const setTokenAmount = (token: "DAI" | "TOR" | "USDC", amount: string) => {
    if (view === 0) {
      if (token === "DAI") {
        setDAIAmount(trim(+amount, 2));
        const usdcDaiRatio = (curveProportions.usdc / curveProportions.dai) * +amount;
        const torDaiRatio = (curveProportions.tor / curveProportions.dai) * +amount;
        setUSDCAmount(trim(usdcDaiRatio, 2));
        setTORAmount(trim(torDaiRatio, 2));
      } else if (token === "USDC") {
        setUSDCAmount(trim(+amount, 2));
        const daiUsdcRatio = (curveProportions.dai / curveProportions.usdc) * +amount;
        const torUsdcRatio = (curveProportions.tor / curveProportions.usdc) * +amount;
        setDAIAmount(trim(daiUsdcRatio, 2));
        setTORAmount(trim(torUsdcRatio, 2));
      } else if (token === "TOR") {
        setTORAmount(trim(+amount, 2));
        const daiTorRatio = (curveProportions.dai / curveProportions.tor) * +amount;
        const usdcTorRatio = (curveProportions.usdc / curveProportions.tor) * +amount;
        setDAIAmount(trim(daiTorRatio, 2));
        setUSDCAmount(trim(usdcTorRatio, 2));
      }
    } else {
      if (token === "DAI") {
        setDAIAmount(trim(+amount, 2));
        setUSDCAmount("0");
        setTORAmount("0");
      } else if (token === "USDC") {
        setUSDCAmount(trim(+amount, 2));
        setDAIAmount("0");
        setTORAmount("0");
      } else if (token === "TOR") {
        setTORAmount(trim(+amount, 2));
        setDAIAmount("0");
        setUSDCAmount("0");
      }
    }
  };

  // initial load
  useEffect(() => {
    if (view === 1 && sliderState) {
      setTORAmount(trim(torPoolInfo?.balance * (curveProportions?.tor / 100), 2));
      setDAIAmount(trim(torPoolInfo?.balance * (curveProportions?.dai / 100), 2));
      setUSDCAmount(trim(torPoolInfo?.balance * (curveProportions?.usdc / 100), 2));
    } else if (view === 1 && !sliderState) {
      setTORAmount(trim(torPoolInfo?.balance, 2));
      setUSDCAmount("0");
      setDAIAmount("0");
    } else if (view === 0) {
      setMax("DAI");
      setMax("USDC");
      setMax("TOR");
    }
  }, [view, daiUsdcBalance, torPoolInfo, curveProportions, sliderState]);

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
    <div className="MuiPaper-root hec-card curve">
      <div className="header">
        <div className="header-title">Curve</div>
        <div className="link">
          <Link className="lp-link" target="_blank" href="https://ftm.curve.fi/factory/62/deposit">
            <SvgIcon component={ArrowUp} htmlColor="#A3A3A3" />
          </Link>
        </div>
        <FormControlLabel
          className={!sliderState ? "slider-off slider" : "slider"}
          control={
            <Switch
              checked={sliderState}
              onChange={() => setSliderState(!sliderState)}
              name="sliderState"
              color="primary"
            />
          }
          label={view === 0 ? "Max" : "Combination"}
        />
      </div>
      <div className="tab-group">
        <Tabs
          className="tabs"
          textColor="primary"
          indicatorColor="primary"
          value={view}
          onChange={changeTabs}
          aria-label="simple tabs example"
        >
          <Tab label="Deposit" {...curveInputProps(0)} />
          <Tab label="Withdraw" {...curveInputProps(1)} />
        </Tabs>
        <div className="token-inputs">
          <div className="token">
            <TorSVG style={{ height: "30px", width: "30px" }} />
            {(hasTorDepositAllowance() || view === 1) && (
              <FormControl className="input-amount" fullWidth variant="outlined">
                <InputLabel htmlFor="outlined-adornment-amount">TOR</InputLabel>
                <OutlinedInput
                  error={isTorFormInvalid()}
                  type="number"
                  disabled={sliderState || view === 1}
                  value={torAmount}
                  onChange={e => setTokenAmount("TOR", e.target.value)}
                  endAdornment={
                    <InputAdornment position="end">
                      {<div className="balance">Balance: {trim(torBalance?.balance, 2)}</div>}
                    </InputAdornment>
                  }
                  labelWidth={30}
                />
                {isTorFormInvalid() && <FormHelperText error>Must be less than or equal to balance!</FormHelperText>}
              </FormControl>
            )}
            {!hasTorDepositAllowance() && view !== 1 && (
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
          </div>
          <div className="token">
            <img src={DaiToken} />
            {(hasDaiDepositAllowance() || view === 1) && (
              <FormControl className="input-amount" fullWidth variant="outlined">
                <InputLabel htmlFor="outlined-dai-amount">DAI</InputLabel>
                <OutlinedInput
                  error={isDaiFormInvalid()}
                  type="number"
                  disabled={sliderState || view === 1}
                  value={daiAmount}
                  onChange={e => setTokenAmount("DAI", e.target.value)}
                  endAdornment={
                    <InputAdornment position="end">
                      {" "}
                      {<div className="balance">Balance: {trim(daiUsdcBalance?.daiBalance, 2)}</div>}
                    </InputAdornment>
                  }
                  labelWidth={27}
                />
                {isDaiFormInvalid() && <FormHelperText error>Must be less than or equal to balance!</FormHelperText>}
              </FormControl>
            )}
            {!hasDaiDepositAllowance() && view !== 1 && (
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
          </div>
          <div className="token">
            <img src={UsdcToken} />
            {(hasUsdcDepositAllowance() || view === 1) && (
              <FormControl className="input-amount" fullWidth variant="outlined">
                <InputLabel htmlFor="outlined-adornment-amount">USDC</InputLabel>
                <OutlinedInput
                  error={isUsdcFormInvalid()}
                  type="number"
                  disabled={sliderState || view === 1}
                  value={usdcAmount}
                  onChange={e => setTokenAmount("USDC", e.target.value)}
                  endAdornment={
                    <InputAdornment position="end">
                      {<div className="balance">Balance: {trim(daiUsdcBalance?.usdcBalance, 2)}</div>}
                    </InputAdornment>
                  }
                  labelWidth={40}
                />
                {isUsdcFormInvalid() && <FormHelperText error>Must be less than or equal to balance!</FormHelperText>}
              </FormControl>
            )}
            {!hasUsdcDepositAllowance() && view !== 1 && (
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
          </div>
        </div>
        <TabPanel value={view} index={0}>
          <Tooltip
            title={
              hasDaiDepositAllowance() && hasUsdcDepositAllowance() && hasTorDepositAllowance()
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
                  !hasAnyBalance() ||
                  !hasDaiDepositAllowance() ||
                  !hasUsdcDepositAllowance() ||
                  !hasTorDepositAllowance()
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
        <RadioGroup
          className="radio-group"
          aria-label="gender"
          name="gender1"
          value={radioValue}
          onChange={handleChange}
        >
          {view === 1 && !sliderState && <FormControlLabel value="TOR" control={<Radio />} label="TOR" />}
          {view === 1 && !sliderState && <FormControlLabel value="DAI" control={<Radio />} label="DAI" />}
          {view === 1 && !sliderState && <FormControlLabel value="USDC" control={<Radio />} label="USDC" />}
        </RadioGroup>
        <TabPanel value={view} index={1}>
          {hasPoolAllowance() && (
            <Button
              onClick={() => (sliderState ? onWithdraw() : onWithdrawOneToken())}
              className="stake-button"
              disabled={!hasAnyBalance() || isLoading}
              variant="contained"
              color="primary"
            >
              Withdraw
            </Button>
          )}
          {!hasPoolAllowance() && (
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
  );
};

const HelpModal = ({ theme }: any) => {
  // const [modalStyle] = useState(getModalStyle);
  const [open, setOpen] = useState(false);

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
