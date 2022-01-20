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
import Countdown, { zeroPad } from "react-countdown";
import { StakingInfo } from "src/types/farming.model";
import { Skeleton } from "@material-ui/lab";

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

  const renderer = ({ days, hours, minutes, seconds, completed }: any) => {
    if (completed) {
      // Render a completed state
      return <div>Cycle Ended!</div>;
    } else {
      // Render a countdown
      return (
        <span>
          {zeroPad(days)}:{zeroPad(hours)}:{zeroPad(minutes)}:{zeroPad(seconds)}
        </span>
      );
    }
  };

  const getEarnedUsd = useCallback(() => {
    if (stakingInfo && assetPrice) {
      const earnedUSD = +ethers.utils.formatEther(stakingInfo?._earnedRewardAmount);
      const assetPriceUSD = assetPrice.toNumber() / 1e8;
      return (earnedUSD * assetPriceUSD).toFixed(2);
    }
  }, [stakingInfo, assetPrice]);

  const getFormattedStakingInfo = useCallback(
    (prop: keyof StakingInfo, units?: ethers.BigNumberish) =>
      stakingInfo ? +ethers.utils.formatUnits(stakingInfo[prop], units) : 0,
    [stakingInfo],
  );

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
    <div className="pool-farming">
      <div className="farming-account">
        <div className="MuiPaper-root hec-card farming">
          <div className="farming-stats">
            <div className="header">
              <SvgIcon component={wshecTokenImg} viewBox="0 0 100 100" style={{ height: "50px", width: "50px" }} />
              <div className="title">TOR Farming</div>
            </div>
            <div className="info">
              <div>
                <div className="title">Apr:</div>
                <div className={theme.palette.text?.gold + " data"}>
                  {stakingInfo ? getFormattedStakingInfo("_apr", "mwei").toFixed(2) : <Skeleton width="50%" />}%
                </div>
              </div>
              <div>
                <div className="title">TVL:</div>
                <div className="data">
                  ${stakingInfo ? getFormattedStakingInfo("_tvl", "ether").toFixed(2) : <Skeleton width="50%" />}
                </div>
              </div>
              <div>
                <div className="title">Cycle Beginning:</div>
                <div className="data">
                  {+stakingInfo?._begin ? new Date(+stakingInfo?._begin * 1000).toString() : <Skeleton width="50%" />}
                </div>
              </div>
            </div>
            <div className="cycle-end">
              <div className="title">Cycle Ends in:</div>
              <div className="data timer">
                <AccessAlarmIcon />
                {+stakingInfo?._finish ? (
                  <Countdown date={new Date(+stakingInfo?._finish * 1000).toString()} renderer={renderer} />
                ) : (
                  <Skeleton width="50%" />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="MuiPaper-root hec-card account">
          <div className="header">
            <div className="title">Earned Rewards</div>
            <Link className="lp-link" target="_blank" href="https://ftm.curve.fi/factory/50/deposit">
              LP Tokens
              <SvgIcon component={ArrowUp} htmlColor="#A3A3A3" />
            </Link>
          </div>
          <div className="balance">
            <div>
              <div className="title">Your LP Tokens:</div>
              <div className="data">
                {hugsPoolInfo?.balance || hugsPoolInfo?.balance === 0 ? (
                  hugsPoolInfo?.balance.toFixed(2)
                ) : (
                  <Skeleton width="40%" />
                )}
              </div>
            </div>
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
            {/* <div className="data">
                      Investment Value: {(stakingRewardsInfo?.balance * hugsPoolInfo?.virtualPrice).toFixed(2)}
                    </div> */}
            <div>
              <div className="title">FTM Rewards</div>
              <div className="data">
                {stakingInfo ? (
                  getFormattedStakingInfo("_earnedRewardAmount", "ether").toFixed(4)
                ) : (
                  <Skeleton width="40%" />
                )}{" "}
                (${getEarnedUsd()})
              </div>
            </div>
          </div>
          <div className="actions">
            {+getFormattedStakingInfo("_earnedRewardAmount", "ether") > 0 && (
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
              Hugs:{" "}
              {stakingInfo ? (
                getFormattedStakingInfo("_optimalHugsAmount", "ether").toFixed(2)
              ) : (
                <Skeleton width="40%" />
              )}
            </div>
            <div className="data">
              DAI:{" "}
              {stakingInfo ? (
                getFormattedStakingInfo("_optimalDaiAmount", "ether").toFixed(2)
              ) : (
                <Skeleton width="40%" />
              )}
            </div>
            <div className="data">
              USDC:{" "}
              {stakingInfo ? (
                getFormattedStakingInfo("_optimalUsdcAmount", "ether").toFixed(2)
              ) : (
                <Skeleton width="40%" />
              )}
            </div>
          </div>
        </div>
        <ProjectionLineChart quantity={calcQuantity} apr={+getFormattedStakingInfo("_apr", "mwei").toFixed(2)} />
      </div>
    </div>
  );
}
