import { useState } from "react";
import { FANTOM } from "../../constants";
import { Link, SvgIcon, Popper, Button, Paper, Typography, Divider, Box, Fade, Slide } from "@material-ui/core";
import { ReactComponent as InfoIcon } from "../../assets/icons/info-fill.svg";
import { ReactComponent as ArrowUpIcon } from "../../assets/icons/arrow-up.svg";
import { ReactComponent as shecTokenImg } from "../../assets/tokens/SHEC.svg";
import { ReactComponent as hecTokenImg } from "../../assets/tokens/HEC.svg";
import { ReactComponent as wshecTokenImg } from "../../assets/tokens/wsHEC.svg";
import { ReactComponent as TorSVG } from "../../assets/tokens/TOR.svg";
import { NavLink } from "react-router-dom";

import "./hecmenu.scss";
import { dai } from "src/helpers/all-bonds/dai-bonds";
import { useWeb3Context } from "../../hooks/web3Context";

import HecImg from "src/assets/tokens/HEC.png";
import SHecImg from "src/assets/tokens/SHEC.png";
import wsHecImg from "src/assets/tokens/wsHEC.png";
import torImg from "src/assets/tokens/TOR.png";

const addTokenToWallet = (tokenSymbol, tokenAddress) => async () => {
  if (window.ethereum) {
    const host = window.location.origin;
    // NOTE (appleseed): 33T token defaults to sHEC logo since we don't have a 33T logo yet
    let tokenPath, decimals;
    // if (tokenSymbol === "HEC") {

    // } ? HecImg : SHecImg;
    switch (tokenSymbol) {
      case "wsHEC":
        tokenPath = wsHecImg;
        decimals = 18;
        break;
      case "HEC":
        tokenPath = HecImg;
        decimals = 9;
        break;
      case "TOR":
        tokenPath = torImg;
        decimals = 18;
        break;
      default:
        tokenPath = SHecImg;
        decimals = 9;
    }
    const imageURL = `${host}/${tokenPath}`;
    try {
      await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: decimals,
            image: imageURL,
          },
        },
      });
    } catch (error) {
      console.log(error);
    }
  }
};

function HecMenu() {
  const [anchorEl, setAnchorEl] = useState(null);
  const isEthereumAPIAvailable = window.ethereum;

  const { chainID } = useWeb3Context();
  const usingFantom = chainID === 0xfa;
  const network = FANTOM;
  const SHEC_ADDRESS = network.SHEC_ADDRESS;
  const WSHEC_ADDRESS = network.WSHEC_ADDRESS;
  const HEC_ADDRESS = network.HEC_ADDRESS;
  const USDC_ADDRESS = network.USDC_ADDRESS;
  const TOR_ADDRESS = network.TOR_ADDRESS;

  const handleClick = event => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };

  const open = Boolean(anchorEl);
  const id = "hec-popper";
  const daiAddress = dai.getAddressForReserve(0xfa);
  return (
    <Box
      component="div"
      onMouseEnter={e => handleClick(e)}
      onMouseLeave={e => handleClick(e)}
      id="hec-menu-button-hover"
    >
      <Button id="hec-menu-button" size="large" variant="contained" color="secondary" title="HEC" aria-describedby={id}>
        <SvgIcon component={InfoIcon} color="primary" />
        <Typography>HEC</Typography>
      </Button>

      <Popper id={id} open={open} anchorEl={anchorEl} placement="bottom-start" transition>
        {({ TransitionProps }) => {
          return (
            <Fade {...TransitionProps} timeout={100}>
              <Paper className="hec-menu" elevation={1}>
                <Box component="div" className="buy-tokens">
                  <Link
                    href={`https://spookyswap.finance/swap?inputCurrency=${daiAddress}&outputCurrency=${HEC_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="large" variant="contained" color="secondary" fullWidth>
                      <Typography align="left">
                        Buy on SpookySwap <SvgIcon component={ArrowUpIcon} htmlColor="#A3A3A3" />
                      </Typography>
                    </Button>
                  </Link>

                  <Link
                    href={`https://swap.spiritswap.finance/#/add/${USDC_ADDRESS}/${HEC_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="large" variant="contained" color="secondary" fullWidth>
                      <Typography align="left">
                        Buy on SpiritSwap <SvgIcon component={ArrowUpIcon} htmlColor="#A3A3A3" />
                      </Typography>
                    </Button>
                  </Link>

                  <Link component={NavLink} to="/wrap" style={{ textDecoration: "none" }}>
                    <Button size="large" variant="contained" color="secondary" fullWidth>
                      <Typography align="left">Wrap sHEC</Typography>
                    </Button>
                  </Link>
                </Box>

                {isEthereumAPIAvailable ? (
                  <Box className="add-tokens">
                    <Divider color="secondary" />
                    <p>ADD TOKEN TO WALLET</p>
                    <Box display="flex" flexDirection="row" justifyContent="space-between">
                      <Button
                        variant="contained"
                        color="secondary"
                        disabled={!usingFantom}
                        onClick={addTokenToWallet("HEC", HEC_ADDRESS)}
                      >
                        <SvgIcon
                          component={hecTokenImg}
                          viewBox="0 0 32 32"
                          style={{ height: "27px", width: "27px" }}
                        />
                        <Typography variant="body1">HEC</Typography>
                      </Button>
                      <Button
                        variant="contained"
                        color="secondary"
                        disabled={!usingFantom}
                        onClick={addTokenToWallet("sHEC", SHEC_ADDRESS)}
                      >
                        <SvgIcon
                          component={shecTokenImg}
                          viewBox="0 0 100 100"
                          style={{ height: "25px", width: "25px" }}
                        />
                        <Typography variant="body1">sHEC</Typography>
                      </Button>
                      <Button
                        variant="contained"
                        color="secondary"
                        disabled={!usingFantom}
                        onClick={addTokenToWallet("wsHEC", WSHEC_ADDRESS)}
                      >
                        <SvgIcon
                          component={wshecTokenImg}
                          viewBox="0 0 100 100"
                          style={{ height: "25px", width: "25px" }}
                        />
                        <Typography variant="body1">wsHEC</Typography>
                      </Button>
                      <Button
                        variant="contained"
                        color="secondary"
                        disabled={!usingFantom}
                        onClick={addTokenToWallet("TOR", TOR_ADDRESS)}
                      >
                        <TorSVG style={{ height: "25px", width: "25px" }} />

                        <Typography variant="body1">TOR</Typography>
                      </Button>
                    </Box>
                  </Box>
                ) : null}
              </Paper>
            </Fade>
          );
        }}
      </Popper>
    </Box>
  );
}

export default HecMenu;
