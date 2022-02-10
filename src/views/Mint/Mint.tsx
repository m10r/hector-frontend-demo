import { BigNumber, ethers } from "ethers";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ReactComponent as TorSVG } from "../../assets/tokens/TOR.svg";
import { RootState } from "src/store";
import DaiToken from "../../assets/tokens/DAI.svg";
import UsdcToken from "../../assets/tokens/USDC.svg";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import OutlinedInput from "@material-ui/core/OutlinedInput";
import {
  daiMintApprove,
  getDaiUsdcBalance,
  getMintAllowance,
  getMintInfo,
  getRedeemInfo,
  getTorBalance,
  mint,
  redeem,
  redeemApprove,
  usdcMintApprove,
} from "src/slices/FarmSlice";
import { useWeb3Context } from "src/hooks/web3Context";
import InputAdornment from "@material-ui/core/InputAdornment";
import Button from "@material-ui/core/Button";
import { TorSupplyChart } from "../TreasuryDashboard/TreasuryDashboard";
import "./Mint.scss";
import { FormHelperText, Tab, Tabs, Tooltip } from "@material-ui/core";
import TabPanel from "src/components/TabPanel";
import { trim } from "src/helpers";
import InfoTooltip from "src/components/InfoTooltip/InfoTooltip";

function InputProps(index: any) {
  return {
    "id": `curve-tab-${index}`,
    "aria-controls": `curve-tabpanel-${index}`,
  };
}

export default function Mint() {
  const dispatch = useDispatch();
  const { torBalance, redeemInfo, mintAllowance, daiUsdcBalance, mintInfo, isLoading } = useSelector(
    (state: RootState) => state.farm,
  );
  const [daiQuantity, setDAIQuantity] = useState("");
  const [usdcQuantity, setUSDCQuantity] = useState("");

  const { provider, chainID, address } = useWeb3Context();
  const [view, setView] = useState(0);

  const changeTabs = (event: React.ChangeEvent<{}>, newValue: number) => {
    setView(newValue);
  };

  const hasDaiMintAllowance = useCallback(() => {
    return mintAllowance?.daiAllowance > BigNumber.from("0");
  }, [mintAllowance]);

  const hasUsdcMintAllowance = useCallback(() => {
    return mintAllowance?.usdcAllowance > BigNumber.from("0");
  }, [mintAllowance]);
  const hasRedeemAllowance = useCallback(() => {
    return mintAllowance?.torAllowance > BigNumber.from("0");
  }, [mintAllowance]);

  const approveDai = () => {
    dispatch(daiMintApprove({ address, provider, networkID: chainID }));
  };
  const approveUsdc = () => {
    dispatch(usdcMintApprove({ address, provider, networkID: chainID }));
  };

  const approveRedeem = () => {
    dispatch(redeemApprove({ address, provider, networkID: chainID }));
  };

  const isDaiFormInvalid = () => {
    if (view === 0 && daiUsdcBalance?.daiBalance < +daiQuantity) {
      return true;
    } else if (view === 0 && daiUsdcBalance?.daiBalance > +daiQuantity) {
      return false;
    }
  };
  const isUsdcFormInvalid = () => {
    if (view === 0 && daiUsdcBalance?.usdcBalance < +usdcQuantity) {
      return true;
    } else if (view === 0 && daiUsdcBalance?.usdcBalance > +usdcQuantity) {
      return false;
    }
  };

  const mintTokens = async () => {
    if (+usdcQuantity > 0) {
      await dispatch(mint({ networkID: chainID, provider, address, value: usdcQuantity, mint: "usdc" }));
    }
    if (+daiQuantity > 0) {
      await dispatch(mint({ networkID: chainID, provider, address, value: daiQuantity, mint: "dai" }));
    }
    setDAIQuantity("");
    setUSDCQuantity("");
  };

  const redeemTokens = async () => {
    if (+daiQuantity > 0) {
      await dispatch(redeem({ networkID: chainID, provider, address, value: daiQuantity, mint: "dai" }));
    }
    if (+usdcQuantity > 0) {
      await dispatch(redeem({ networkID: chainID, provider, address, value: usdcQuantity, mint: "usdc" }));
    }
    setDAIQuantity("");
    setUSDCQuantity("");
  };

  async function getMintData() {
    await dispatch(getTorBalance({ networkID: chainID, provider, address }));
    await dispatch(getMintAllowance({ networkID: chainID, provider, address }));
    await dispatch(
      getMintInfo({ networkID: chainID, provider, address, value: (+usdcQuantity + +daiQuantity).toString() }),
    );
    await dispatch(
      getRedeemInfo({ networkID: chainID, provider, address, value: (+usdcQuantity + +daiQuantity).toString() }),
    );
    await dispatch(getDaiUsdcBalance({ networkID: chainID, provider, address }));
  }

  useEffect(() => {
    if (chainID && provider && address) {
      getMintData();
    }
  }, [chainID, provider, address]);

  useEffect(() => {
    if (address && provider) {
      dispatch(
        getMintInfo({ networkID: chainID, provider, address, value: (+usdcQuantity + +daiQuantity).toString() }),
      );
      dispatch(
        getRedeemInfo({ networkID: chainID, provider, address, value: (+usdcQuantity + +daiQuantity).toString() }),
      );
    }
  }, [usdcQuantity, daiQuantity, provider, address]);

  const tooltipDepositText = (): string => {
    if (!mintInfo.isCurvePercentageBelowCeiling) {
      return "Minting is not available because curve offers a better price";
    } else if (!mintInfo.isLowerThanReserveCeiling) {
      return "Minting is not available because TOR supply is too high";
    } else if (!hasDaiMintAllowance() && !hasUsdcMintAllowance()) {
      return "Please approve one or both of the tokens above to mint tor.";
    } else if (Math.trunc(+ethers.utils.formatEther(mintInfo.mintLimit)) === 0) {
      return "You have hit your mint limit.";
    } else {
      return "";
    }
  };
  const tooltipRedeemText = (): string => {
    if (+daiQuantity + +usdcQuantity > torBalance?.balance) {
      return "Must have redeem quantity below TOR balance.";
    } else if (!hasRedeemAllowance()) {
      return "Please approve to redeem.";
    } else if (+daiQuantity + +usdcQuantity === 0) {
      return "Must have a redeem amount above 0";
    } else if (!redeemInfo.isCurvePercentageAboveFloor) {
      return "Redeeming is not availabe because curve offers a better price";
    } else if (!redeemInfo.ishigherThanReserveFloor) {
      return "Redeeming is not available because TOR supply is too low";
    } else {
      return "";
    }
  };

  return (
    <div className="mint">
      <TorGraph />
      <div className="MuiPaper-root hec-card balances">
        <div className="header-title">Balances</div>
        <div className="token">
          <div>Balance</div>
          <div className="details">
            <TorSVG style={{ height: "35px", width: "35px" }} />
            <div className="balance">{trim(torBalance?.balance, 4)}</div>
          </div>
        </div>
        <hr />
        <div className="token">
          <div>Balance</div>
          <div className="details">
            <img src={DaiToken} />

            <div className="balance">{trim(daiUsdcBalance?.daiBalance, 4)}</div>
          </div>
        </div>
        <hr />
        <div className="token">
          <div>Balance</div>
          <div className="details">
            <img src={UsdcToken} />

            <div className="balance">{trim(daiUsdcBalance?.usdcBalance, 4)}</div>
          </div>
        </div>
      </div>
      <div className="MuiPaper-root hec-card mint-tokens">
        <div className="header">
          <div className="header-title">Mint</div>

          {mintInfo && (
            <div className="max">
              {view === 0
                ? Math.trunc(+ethers.utils.formatEther(mintInfo?.mintLimit))
                : Math.trunc(+ethers.utils.formatEther(redeemInfo?.redeemLimit))}{" "}
              Limit{" "}
              <InfoTooltip
                message={`The limit amount is used to control the amount of TOR that is ${
                  view === 0 ? "minted" : "redeemed"
                }`}
              />
            </div>
          )}
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
            <Tab label="Mint" {...InputProps(0)} />
            <Tab label="Redeem" {...InputProps(1)} />
          </Tabs>
          <div className="mint-dai">
            <img src={DaiToken} />
            {hasDaiMintAllowance() && (
              <>
                <FormControl className="input-amount" fullWidth variant="outlined">
                  <InputLabel htmlFor="outlined-adornment-amount">DAI</InputLabel>
                  <OutlinedInput
                    id="outlined-adornment-amount"
                    type="number"
                    error={isDaiFormInvalid()}
                    value={daiQuantity}
                    onChange={e => setDAIQuantity(e.target.value)}
                    endAdornment={
                      <InputAdornment position="end">
                        {" "}
                        <Button
                          variant="text"
                          onClick={() =>
                            view === 0
                              ? setDAIQuantity(daiUsdcBalance?.daiBalance.toString())
                              : setDAIQuantity(torBalance?.balance.toString())
                          }
                          color="inherit"
                        >
                          Max
                        </Button>
                      </InputAdornment>
                    }
                    labelWidth={25}
                  />
                  {isDaiFormInvalid() && <FormHelperText error>Must be less than or equal to balance!</FormHelperText>}
                </FormControl>
              </>
            )}

            {!hasDaiMintAllowance() && (
              <Button
                className="stake-button"
                variant="contained"
                color="primary"
                disabled={isLoading}
                onClick={() => approveDai()}
              >
                Approve
              </Button>
            )}
          </div>
          <div className="mint-usdc">
            <img src={UsdcToken} />
            {hasUsdcMintAllowance() && (
              <>
                <FormControl className="input-amount" fullWidth variant="outlined">
                  <InputLabel htmlFor="outlined-adornment-amount">USDC</InputLabel>
                  <OutlinedInput
                    id="outlined-adornment-amount"
                    type="number"
                    error={isUsdcFormInvalid()}
                    value={usdcQuantity}
                    endAdornment={
                      <InputAdornment position="end">
                        {" "}
                        <Button
                          variant="text"
                          onClick={() =>
                            view === 0
                              ? setUSDCQuantity(daiUsdcBalance?.usdcBalance.toString())
                              : setUSDCQuantity(torBalance?.balance.toString())
                          }
                          color="inherit"
                        >
                          Max
                        </Button>
                      </InputAdornment>
                    }
                    onChange={e => setUSDCQuantity(e.target.value)}
                    labelWidth={40}
                  />
                  {isUsdcFormInvalid() && <FormHelperText error>Must be less than or equal to balance!</FormHelperText>}
                </FormControl>
              </>
            )}

            {!hasUsdcMintAllowance() && (
              <Button
                className="stake-button"
                variant="contained"
                color="primary"
                disabled={isLoading}
                onClick={() => approveUsdc()}
              >
                Approve
              </Button>
            )}
          </div>
          <TabPanel value={view} index={0}>
            {mintInfo && (
              <Tooltip title={tooltipDepositText()}>
                <span>
                  <Button
                    className="stake-button"
                    variant="contained"
                    color="primary"
                    disabled={
                      isLoading ||
                      Math.trunc(+ethers.utils.formatEther(mintInfo.mintLimit)) === 0 ||
                      !mintInfo.isCurvePercentageBelowCeiling ||
                      !mintInfo.isLowerThanReserveCeiling ||
                      (hasDaiMintAllowance() || hasUsdcMintAllowance() ? false : true) ||
                      isUsdcFormInvalid() ||
                      isDaiFormInvalid() ||
                      +daiQuantity + +usdcQuantity === 0
                    }
                    onClick={() => mintTokens()}
                  >
                    Mint
                  </Button>
                </span>
              </Tooltip>
            )}
          </TabPanel>
          <TabPanel value={view} index={1}>
            {redeemInfo && hasRedeemAllowance() && (
              <Tooltip title={tooltipRedeemText()}>
                <span>
                  <Button
                    className="stake-button"
                    variant="contained"
                    color="primary"
                    disabled={
                      isLoading ||
                      Math.trunc(+ethers.utils.formatEther(redeemInfo.redeemLimit)) === 0 ||
                      !redeemInfo.isCurvePercentageAboveFloor ||
                      !redeemInfo.ishigherThanReserveFloor ||
                      !hasRedeemAllowance() ||
                      +daiQuantity + +usdcQuantity > torBalance?.balance ||
                      +daiQuantity + +usdcQuantity === 0
                    }
                    onClick={() => redeemTokens()}
                  >
                    Redeem
                  </Button>
                </span>
              </Tooltip>
            )}
            {!hasRedeemAllowance() && (
              <Button
                className="stake-button"
                variant="contained"
                color="primary"
                disabled={isLoading}
                onClick={() => approveRedeem()}
              >
                Approve
              </Button>
            )}
          </TabPanel>
        </div>
      </div>
    </div>
  );
}

const TorGraph = () => {
  return (
    <div className="MuiPaper-root hec-card farming tor-supply" style={{ margin: 0, maxWidth: "100%" }}>
      <TorSupplyChart />
    </div>
  );
};
