import "./pool-farming.scss";
import { useCallback, useEffect, useState } from "react";

import { ethers } from "ethers";
import { Button, FormControl, InputAdornment, InputLabel, Link, OutlinedInput, SvgIcon } from "@material-ui/core";
import { useWeb3Context } from "src/hooks/web3Context";
import { useDispatch, useSelector } from "react-redux";

import ProjectionLineChart from "src/components/pool-farming/line-chart/line-chart";
import { ReactComponent as wshecTokenImg } from "../../assets/tokens/wsHEC.svg";
import { RootState } from "src/store";
import {
  approve,
  claimRewards,
  getAssetPrice,
  getHugsPoolInfo,
  getStakingInfo,
  getStakingRewardsInfo,
  stake,
  withDrawStaked,
} from "src/slices/FarmSlice";
import { ReactComponent as ArrowUp } from "../../assets/icons/arrow-up.svg";
import AccessAlarmIcon from "@material-ui/icons/AccessAlarm";
import moment from "moment";
import Countdown from "react-countdown";

export default function PoolFarming({ theme }: any) {
  const { assetPrice, stakingRewardsInfo, hugsPoolInfo, stakingInfo, isLoading } = useSelector(
    (state: RootState) => state.farm,
  );
  const [quantity, setQuantity] = useState("");
  const [calcQuantity, setCalcQuantity] = useState(0);
  const dispatch = useDispatch();
  const { provider, chainID, address } = useWeb3Context();

  const hasAllowance = useCallback(() => {
    return hugsPoolInfo?.allowance < hugsPoolInfo?.balance;
  }, [hugsPoolInfo]);

  const hasLpBalance = useCallback(() => hugsPoolInfo?.balance > 0, [hugsPoolInfo]);

  const hasLoadedInfo = useCallback(() => stakingInfo && assetPrice?.toNumber(), [stakingInfo, assetPrice]);

  function getEarnedFTM(): string {
    const rewards = (+ethers.utils.formatEther(stakingInfo?._earnedRewardAmount)).toFixed(4);
    return rewards;
  }

  function getEarnedUsd(): string {
    const earnedUSD = +ethers.utils.formatEther(stakingInfo?._earnedRewardAmount);
    const assetPriceUSD = assetPrice.toNumber() / 1e8;
    return (earnedUSD * assetPriceUSD).toFixed(2);
  }

  async function dispatchStakingInfo(): Promise<void> {
    await dispatch(getStakingInfo({ networkID: chainID, provider, address, value: quantity }));
    setCalcQuantity(+quantity);
  }
  async function dispatchClaimEarned(): Promise<void> {
    await dispatch(claimRewards({ networkID: chainID, provider, address }));
    dispatchStakingInfo();
  }
  async function dispatchStake(): Promise<void> {
    await dispatch(stake({ networkID: chainID, provider, address }));
    getAllData();
  }
  async function dispatchWithDraw(): Promise<void> {
    await dispatch(withDrawStaked({ networkID: chainID, provider, address }));
    getAllData();
  }
  async function dispatchApprove(): Promise<void> {
    await dispatch(approve({ networkID: chainID, provider }));
    getAllData();
  }

  async function getAllData() {
    await dispatch(getAssetPrice({ networkID: chainID, provider }));
    await dispatch(getStakingInfo({ networkID: chainID, provider, address, value: "0" }));
    await dispatch(getStakingRewardsInfo({ networkID: chainID, provider, address }));
    await dispatch(getHugsPoolInfo({ networkID: chainID, provider, address }));
  }

  useEffect(() => {
    if (chainID && provider && address) {
      getAllData();
    }
  }, [chainID, provider, address]);
  return (
    <>
      {stakingInfo && address && provider && (
        <div className="pool-farming">
          <div className="farming-account">
            <div className="MuiPaper-root hec-card farming">
              <div className="farming-stats">
                <div className="header">
                  <SvgIcon component={wshecTokenImg} viewBox="0 0 100 100" style={{ height: "50px", width: "50px" }} />
                  <div className="title">TOR Farming</div>
                  {/* <Link className="lp-link" target="_blank" href="https://ftm.curve.fi/factory/50/deposit">
                      Get LP Tokens
                      <SvgIcon component={ArrowUp} htmlColor="#A3A3A3" />
                    </Link> */}
                </div>
                <div className="info">
                  <div>
                    <div className="title">Apr:</div>
                    <div className={theme.palette.text?.gold + " data"}>
                      {(+ethers.utils.formatUnits(stakingInfo._apr, "mwei")).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="title">TVL:</div>
                    <div className="data">${(+ethers.utils.formatEther(stakingInfo._tvl)).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="title">Cycle Beginning:</div>
                    <div className="data">{new Date(+stakingInfo._begin * 1000).toString()}</div>
                  </div>
                  <div className="cycle-end">
                    <div className="title">Cycle Ends in:</div>
                    <div className="data timer">
                      <AccessAlarmIcon />
                      <Countdown date={new Date(+stakingInfo._finish * 1000).toString()} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="MuiPaper-root hec-card account">
              <div className="title">Earned Rewards</div>
              <div className="balance">
                {hasLoadedInfo() && (
                  <>
                    {hugsPoolInfo && <div className="data">Your LP Tokens: {hugsPoolInfo.balance.toFixed(2)}</div>}
                    <div className="data">
                      Investment Value: {(stakingRewardsInfo?.balance * hugsPoolInfo?.virtualPrice).toFixed(2)}
                    </div>
                    <div className="data">(FTM): {getEarnedFTM()}</div>
                    <div className="data">(USD): ${getEarnedUsd()}</div>
                    <div className="data">Staked LP Tokens: {stakingRewardsInfo?.balance.toFixed(2)}</div>
                  </>
                )}
                <div className="withdraw-amounts">
                  <div>Withdraw to Hugs: {(+ethers.utils.formatEther(stakingInfo._hugsWithdrawAmount)).toFixed(2)}</div>
                  <div>Withdraw to DAI: {(+ethers.utils.formatEther(stakingInfo._daiWithdrawAmount)).toFixed(2)}</div>
                  <div>
                    Withdraw to USDC: {(+ethers.utils.formatUnits(stakingInfo._usdcWithdrawAmount, "mwei")).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="actions">
                {hasLpBalance() && (
                  <Button
                    className="stake-button"
                    variant="contained"
                    color="primary"
                    disabled={isLoading}
                    onClick={() => dispatchStake()}
                  >
                    Stake
                  </Button>
                )}

                {+getEarnedFTM() > 0 && (
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
                {hasAllowance() && (
                  <Button
                    className="stake-button"
                    variant="contained"
                    color="primary"
                    disabled={isLoading}
                    onClick={() => dispatchApprove()}
                  >
                    Approve
                  </Button>
                )}
                {stakingRewardsInfo?.balance > 0 && (
                  <>
                    <Button
                      className="stake-button"
                      variant="contained"
                      color="primary"
                      disabled={isLoading}
                      onClick={() => dispatchWithDraw()}
                    >
                      Withdraw
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="MuiPaper-root hec-card projection">
            <div className="investment-plan">
              <div className="title">Investment Estimation Plan</div>
              <div className="calculate">
                <FormControl fullWidth variant="outlined">
                  <InputLabel htmlFor="outlined-adornment-amount">Amount</InputLabel>
                  <OutlinedInput
                    id="outlined-adornment-amount"
                    type="number"
                    value={quantity}
                    onKeyPress={event => {
                      if (!/[0-9]/.test(event.key)) {
                        event.preventDefault();
                      }
                    }}
                    onChange={e => setQuantity(e.target.value)}
                    startAdornment={<InputAdornment position="start">$</InputAdornment>}
                    labelWidth={60}
                  />
                </FormControl>

                <Button
                  className="stake-button"
                  variant="contained"
                  color="primary"
                  disabled={isLoading}
                  onClick={() => dispatchStakingInfo()}
                >
                  Calculate
                </Button>
              </div>
              <div className="optimal-amount">
                <div className="title">Optimal Amounts</div>
                <div className="data">
                  Hugs: {(+ethers.utils.formatEther(stakingInfo._optimalHugsAmount)).toFixed(2)}
                </div>
                <div className="data">DAI: {(+ethers.utils.formatEther(stakingInfo._optimalDaiAmount)).toFixed(2)}</div>
                <div className="data">
                  USDC: {(+ethers.utils.formatEther(stakingInfo._optimalUsdcAmount)).toFixed(2)}
                </div>
              </div>
            </div>
            <ProjectionLineChart
              quantity={calcQuantity}
              apr={+(+ethers.utils.formatUnits(stakingInfo._apr, "mwei")).toFixed(2)}
            />
          </div>
        </div>
      )}
    </>
  );
}
