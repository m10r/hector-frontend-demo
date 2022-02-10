import { ethers } from "ethers";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ReactComponent as TorSVG } from "../../assets/tokens/TOR.svg";
import { RootState } from "src/store";
import DaiToken from "../../assets/tokens/DAI.svg";
import UsdcToken from "../../assets/tokens/USDC.svg";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import OutlinedInput from "@material-ui/core/OutlinedInput";
import { error } from "src/slices/MessagesSlice";
import {
  daiApprove,
  getDaiUsdcBalance,
  getMintAllowance,
  getMintInfo,
  getRedeemInfo,
  getTorBalance,
  getWhitelistAmount,
  mint,
  redeem,
  usdcApprove,
} from "src/slices/FarmSlice";
import useBonds, { IAllBondData } from "src/hooks/Bonds";
import { useWeb3Context } from "src/hooks/web3Context";
import InputAdornment from "@material-ui/core/InputAdornment";
import Button from "@material-ui/core/Button";
import { TorSupplyChart } from "../TreasuryDashboard/TreasuryDashboard";
import "./Mint.scss";
import { FormHelperText, Tab, Tabs, Tooltip } from "@material-ui/core";
import TabPanel from "src/components/TabPanel";

function InputProps(index: any) {
  return {
    "id": `curve-tab-${index}`,
    "aria-controls": `curve-tabpanel-${index}`,
  };
}

export default function Mint() {
  const dispatch = useDispatch();
  let { bonds } = useBonds();
  const { torBalance, redeemInfo, whiteList, mintAllowance, daiUsdcBalance, mintInfo, isLoading } = useSelector(
    (state: RootState) => state.farm,
  );
  const [daiQuantity, setDAIQuantity] = useState("");
  const [usdcQuantity, setUSDCQuantity] = useState("");

  const { provider, chainID, address } = useWeb3Context();
  const [view, setView] = useState(0);

  const changeTabs = (event: React.ChangeEvent<{}>, newValue: number) => {
    setView(newValue);
  };

  const inWhitelist = useCallback(() => {
    if (whiteList) {
      return +ethers.utils.formatUnits(whiteList?.minted) > 0;
    }
  }, [whiteList]);

  const hasDaiAllowance = useCallback(() => {
    return mintAllowance?.daiAllowance > 0;
  }, [mintAllowance]);

  const hasUsdcAllowance = useCallback(() => {
    return mintAllowance?.usdcAllowance > 0;
  }, [mintAllowance]);

  const approveDai = () => {
    dispatch(daiApprove({ address, provider, networkID: chainID }));
  };
  const approveUsdc = () => {
    dispatch(usdcApprove({ address, provider, networkID: chainID }));
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
    if (!mintInfo.isCurvePercentageBelowCeiling || !mintInfo.isLowerThanReserveCeiling) {
      return "Minting temporarily disabled.";
    } else if (!hasDaiAllowance() && !hasUsdcAllowance()) {
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
    } else if (+daiQuantity + +usdcQuantity === 0) {
      return "Must have a redeem balance above 0";
    } else {
      return "";
    }
  };

  return (
    <div className="mint">
      <TorGraph />
      <div className="MuiPaper-root hec-card balances">
        <div className="tor-balance">
          <div>Balance</div>
          <div className="balance">
            <TorSVG style={{ height: "35px", width: "35px", marginRight: "10px" }} />
            <div className="amount">{torBalance?.balance > 0 ? torBalance?.balance.toFixed(2) : 0.0}</div>
          </div>
        </div>
      </div>
      <div className="MuiPaper-root hec-card mint-tokens">
        <div className="header">
          <div className="header-title">Mint</div>
          {mintInfo && <div className="max">{Math.trunc(+ethers.utils.formatEther(mintInfo?.mintLimit))} Limit</div>}
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
            {hasDaiAllowance() ? (
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
            ) : (
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
            {hasUsdcAllowance() ? (
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
            ) : (
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
                      (hasDaiAllowance() || hasUsdcAllowance() ? false : true) ||
                      isUsdcFormInvalid() ||
                      isDaiFormInvalid()
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
            {redeemInfo && (
              <Tooltip title={tooltipRedeemText()}>
                <span>
                  <Button
                    className="stake-button"
                    variant="contained"
                    color="primary"
                    disabled={
                      isLoading ||
                      Math.trunc(+ethers.utils.formatEther(redeemInfo.redeemLimit)) === 0 ||
                      redeemInfo.isCurvePercentageAboveFloor ||
                      !redeemInfo.ishigherThanReserveFloor ||
                      (hasDaiAllowance() || hasUsdcAllowance() ? false : true) ||
                      isUsdcFormInvalid() ||
                      isDaiFormInvalid() ||
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
