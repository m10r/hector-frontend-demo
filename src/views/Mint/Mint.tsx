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
  getMintAllowance,
  getTorBalance,
  getWhitelistAmount,
  mint,
  usdcApprove,
} from "src/slices/FarmSlice";
import useBonds, { IAllBondData } from "src/hooks/Bonds";
import { useWeb3Context } from "src/hooks/web3Context";
import InputAdornment from "@material-ui/core/InputAdornment";
import Button from "@material-ui/core/Button";
import { TorSupplyChart } from "../TreasuryDashboard/TreasuryDashboard";
import "./Mint.scss";

export default function Mint() {
  const dispatch = useDispatch();
  let { bonds } = useBonds();
  const { torBalance: torInfo, whiteList, mintAllowance, isLoading } = useSelector((state: RootState) => state.farm);
  const [daiQuantity, setDAIQuantity] = useState("");
  const [usdcQuantity, setUSDCQuantity] = useState("");
  const daiBond = bonds.find(bond => bond.displayName === "DAI" && !bond.isOld) as IAllBondData;
  const usdcBond = bonds.find(bond => bond.displayName === "USDC" && !bond.isOld) as IAllBondData;
  const { provider, chainID, address } = useWeb3Context();

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

  const mintTokens = async () => {
    if (usdcQuantity === "0" || usdcQuantity === "0.0" || daiQuantity === "0" || daiQuantity === "0.0") {
      return dispatch(error("Please enter a value greater than 0"));
    }
    if (+usdcQuantity > +usdcBond.balance || +daiQuantity > +daiBond.balance) {
      return dispatch(error("You cannot mint more than your balance."));
    }
    if (+usdcQuantity > 0) {
      await dispatch(mint({ networkID: chainID, provider, address, value: usdcQuantity, mint: "usdc" }));
    }
    if (+daiQuantity > 0) {
      await dispatch(mint({ networkID: chainID, provider, address, value: daiQuantity, mint: "dai" }));
    }
    setDAIQuantity("");
    setUSDCQuantity("");
  };

  async function getMintData() {
    await dispatch(getTorBalance({ networkID: chainID, provider, address }));
    await dispatch(getMintAllowance({ networkID: chainID, provider, address }));
    await dispatch(getWhitelistAmount({ networkID: chainID, provider, address }));
  }

  useEffect(() => {
    if (chainID && provider && address) {
      getMintData();
    }
  }, [chainID, provider, address]);
  return (
    <div className="mint">
      <TorGraph />
      <div className="MuiPaper-root hec-card mint-tokens">
        <div className="header">
          <div className="header-title">Mint</div>
          <div className="max">
            {inWhitelist()
              ? `${(
                  +ethers.utils.formatUnits(whiteList?.limitPerAccount) - +ethers.utils.formatUnits(whiteList?.minted)
                ).toFixed(2)} Limit`
              : "Not Whitelisted"}
          </div>
        </div>
        <div className="content">
          <div className="tor-balance">
            <div>Balance</div>
            <div className="balance">
              <TorSVG style={{ height: "25px", width: "25px", marginRight: "10px" }} />
              <div className="amount">{torInfo?.balance > 0 ? torInfo?.balance.toFixed(2) : 0.0}</div>
            </div>
          </div>
          <div className="mint-dai">
            <img src={DaiToken} />
            {hasDaiAllowance() ? (
              <>
                <FormControl className="input-amount" fullWidth variant="outlined">
                  <InputLabel htmlFor="outlined-adornment-amount">DAI</InputLabel>
                  <OutlinedInput
                    id="outlined-adornment-amount"
                    type="number"
                    value={daiQuantity}
                    onChange={e => setDAIQuantity(e.target.value)}
                    endAdornment={
                      <InputAdornment position="end">
                        {" "}
                        <Button variant="text" onClick={() => setDAIQuantity(daiBond.balance)} color="inherit">
                          Max
                        </Button>
                      </InputAdornment>
                    }
                    labelWidth={25}
                  />
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
            {hasDaiAllowance() && <div className="balance">Balance: {(+daiBond?.balance).toFixed(4)}</div>}
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
                    value={usdcQuantity}
                    endAdornment={
                      <InputAdornment position="end">
                        {" "}
                        <Button variant="text" onClick={() => setUSDCQuantity(usdcBond.balance)} color="inherit">
                          Max
                        </Button>
                      </InputAdornment>
                    }
                    onChange={e => setUSDCQuantity(e.target.value)}
                    labelWidth={40}
                  />
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
            {hasDaiAllowance() && <div className="balance">Balance: {(+usdcBond?.balance).toFixed(4)}</div>}
          </div>
          <Button
            className="stake-button"
            variant="contained"
            color="primary"
            disabled={isLoading || (hasDaiAllowance() || hasUsdcAllowance() ? false : true) || !inWhitelist()}
            onClick={() => mintTokens()}
          >
            Mint
          </Button>
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
