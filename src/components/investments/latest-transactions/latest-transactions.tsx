import { FTMScanTransaction, TokenDetail, Transaction } from "src/types/investments.model";
import "./latest-transactions.scss";
import LinkIcon from "@material-ui/icons/Link";
import HecToken from "../../../assets/tokens/HEC.png";
import CurveToken from "../../../assets/tokens/curve.png";
import DaiToken from "../../../assets/tokens/DAI.svg";
import MimToken from "../../../assets/tokens/MIM.svg";
import UsdcToken from "../../../assets/tokens/USDC.svg";
import wFTMToken from "../../../assets/tokens/wFTM.png";
import wEthToken from "../../../assets/tokens/wETH.png";
import { useEffect, useState } from "react";
import HelpOutlineIcon from "@material-ui/icons/HelpOutline";
import { Box, CircularProgress, Fade, Link, Paper, Popper, Tooltip } from "@material-ui/core";
import { useWeb3Context } from "src/hooks/web3Context";
import { ethers } from "ethers";

interface Props {
  transactions: Transaction[];
  isLoading: boolean;
  ftmScanTransactionData: FTMScanTransaction[][];
}

type Open = {
  [key: string]: boolean;
};
export default function LatestTransactions({ transactions, ftmScanTransactionData, isLoading }: Props) {
  const [sortedTransactions, setSortedTransactions] = useState<Transaction[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState<Open>({});
  const { provider } = useWeb3Context();

  const handleClick = (index: number) => (event: any) => {
    setAnchorEl(event.currentTarget);

    if (open[`${index}`]) {
      setOpen(prev => ({ ...prev, [index]: false }));
      return;
    }
    Object.keys(open).forEach(key => {
      open[key] = false;
    });
    setOpen(open => ({ ...open, [index]: true }));
  };

  const getTokens = (data: FTMScanTransaction[]): TokenDetail[] => {
    return data
      .filter((transaction, i, arr) => arr.findIndex(item => item.tokenSymbol === transaction.tokenSymbol) === i)
      .map(
        transaction =>
          ({ token: transaction.tokenName, ticker: transaction.tokenSymbol, price: transaction.value } as TokenDetail),
      );
  };

  const getInvestedAmount = (transGroup: FTMScanTransaction[]): string => {
    if (transGroup.length > 4) {
      return (+ethers.utils.formatEther(transGroup.find(item => item.tokenSymbol === "DAI").value) * 2).toFixed(2);
    } else {
      return (+ethers.utils.formatEther(transGroup.find(item => item.tokenSymbol === "DAI").value)).toFixed(2);
    }
  };
  const formatFTMScanData = () => {
    const ftmScantransactions: Transaction[] = ftmScanTransactionData.map((trans, i) => {
      return {
        proposal: undefined,
        title: "Buyback and Burn",
        type: "Buyback-Burn",
        investments: {
          tokenDetails: getTokens(ftmScanTransactionData[i]),
          transactionLinks: [`https://ftmscan.com/tx/${trans[0].hash}`],
          transactionDate: new Date(+trans[0]?.timeStamp * 1000).toLocaleDateString(),
          investedAmount: getInvestedAmount(trans),
        },
      };
    });

    const sortedData = [...ftmScantransactions, ...transactions]
      .sort((a, b) => {
        return new Date(a.investments.transactionDate).getTime() - new Date(b.investments.transactionDate).getTime();
      })
      .reverse();
    setSortedTransactions(sortedData);
  };

  useEffect(() => {
    if (ftmScanTransactionData.length > 0) {
      formatFTMScanData();
    }
  }, [transactions, ftmScanTransactionData]);

  return (
    <div className="latest-transactions MuiPaper-root hec-card">
      <div className="toolbar">
        <div className="title">Latest Transactions</div>
        <Tooltip
          arrow
          title="Transactions that were approved on by our community members. You can participate and monitor future proposals at https://vote.hectordao.com"
        >
          <HelpOutlineIcon />
        </Tooltip>
      </div>
      <div className="transactions">
        {isLoading ? (
          <Box style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress style={{ height: "auto", width: "auto" }} />
          </Box>
        ) : (
          <>
            {sortedTransactions &&
              sortedTransactions.map((transaction, i) => (
                <div key={i}>
                  <div key={i} className="transaction">
                    <div className="date">
                      <b>{transaction.investments.transactionDate}</b>
                    </div>
                    <div className="title">{transaction.title}</div>
                    <div className="type">{transaction.type}</div>
                    <div className="tokens">
                      {transaction.investments.tokenDetails.map((token, i) => (
                        <>
                          {(() => {
                            switch (token.ticker) {
                              case "HEC":
                                return <img src={HecToken} />;
                              case "CRV":
                                return <img src={CurveToken} />;
                              case "DAI":
                                return <img src={DaiToken} />;
                              case "MIM":
                                return <img src={MimToken} />;
                              case "wETH":
                                return <img src={wEthToken} />;
                              case "wFTM":
                                return <img src={wFTMToken} />;
                              case "USDC":
                                return <img src={UsdcToken} />;
                            }
                          })()}
                        </>
                      ))}
                    </div>
                    <div className="price">
                      <b>${transaction.investments.investedAmount}</b>
                    </div>
                    <div onClick={handleClick(i)}>
                      <LinkIcon />
                      <Popper
                        id="transaction-popper"
                        modifiers={{
                          flip: {
                            enabled: true,
                          },
                          preventOverflow: {
                            enabled: true,
                            boundariesElement: "scrollParent",
                          },
                        }}
                        open={open[i]}
                        anchorEl={anchorEl}
                        placement={"bottom"}
                        transition
                      >
                        {({ TransitionProps }) => (
                          <Fade {...TransitionProps} timeout={350}>
                            <Paper className="hec-popover">
                              <div className="title">
                                {transaction.investments.transactionLinks.length > 1
                                  ? "FTM Transactions"
                                  : "FTM Transaction"}
                              </div>
                              <hr />
                              <div className="transaction-list">
                                {transaction.investments.transactionLinks.map((link, i) => (
                                  <Link rel="noreferrer" target="_blank" href={link} key={i}>
                                    {i + 1}. Transaction
                                  </Link>
                                ))}
                              </div>
                            </Paper>
                          </Fade>
                        )}
                      </Popper>
                    </div>
                  </div>
                  <hr />
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
