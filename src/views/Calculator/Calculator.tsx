import { useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import "./calculator.scss";
import { Grid, InputAdornment, OutlinedInput, Zoom, Slider, Paper, Box, Typography } from "@material-ui/core";
import { trim, prettyDisplayNumber, prettyInputNumber } from "../../helpers";
import { Skeleton } from "@material-ui/lab";
import BigNumber from "bignumber.js";
import { RootState } from "src/store";

function Calculator() {
  const isAppLoading = useSelector<RootState>(state => state.app.loading);
  const marketPrice = useSelector<RootState, number>(state => {
    // @ts-ignore
    return (state.app.marketPrice as number) || 0;
  });
  const stakingApy = useSelector<RootState, number>(state => {
    // @ts-ignore
    return state.app.stakingAPY || 0;
  });
  const shecBalance = useSelector<RootState, number>(state => {
    // @ts-ignore
    return (state.account.balances && parseFloat(state.account.balances.shec)) || 0;
  });

  const [inputInitialShec, setInputInitialShec] = useState<string>(shecBalance !== 0 && shecBalance.toString());
  const [inputApy, setInputApy] = useState<string>(stakingApy !== 0 && (stakingApy * 100).toFixed(2));
  const [inputInitialPrice, setInputInitialPrice] = useState<string>(marketPrice !== 0 && marketPrice.toFixed(2));
  const [inputFinalPrice, setInputFinalPrice] = useState<string>(marketPrice !== 0 && marketPrice.toFixed(2));
  const [inputDays, setInputDays] = useState(30);

  const [rewardsEstimation, setRewardsEstimation] = useState("0");
  const [potentialReturn, setPotentialReturn] = useState("0");

  useEffect(() => {
    if (shecBalance !== 0 && !inputInitialShec) {
      setInputInitialShec(shecBalance.toString());
    }
  }, [shecBalance]);
  useEffect(() => {
    if (stakingApy !== 0 && !inputApy) {
      setInputApy((stakingApy * 100).toFixed(2));
    }
  }, [stakingApy]);
  useEffect(() => {
    if (marketPrice === 0) {
      return;
    }
    setInputInitialPrice(inputInitialPrice || marketPrice.toFixed(2));
    setInputFinalPrice(inputFinalPrice || marketPrice.toFixed(2));
  }, [marketPrice]);

  const initialUsd = useMemo(() => {
    const shec = parseFloat(inputInitialShec) || 0;
    const price = parseFloat(inputInitialPrice) || 0;
    const amount = shec * price;
    return prettyDisplayNumber(new BigNumber(amount));
  }, [inputInitialShec, inputInitialPrice]);

  useEffect(() => {
    const DAYS_PER_YEAR = 365.25;
    const apy = parseFloat(inputApy) / 100;
    const apr = DAYS_PER_YEAR * Math.pow(apy + 1, 1 / DAYS_PER_YEAR) - DAYS_PER_YEAR;
    const startBalance = parseFloat(inputInitialShec);
    const endBalance = startBalance * Math.pow(1 + apr / DAYS_PER_YEAR, inputDays);
    setRewardsEstimation(prettyDisplayNumber(new BigNumber(endBalance)));
    const newPotentialReturn = endBalance * (parseFloat(inputFinalPrice) || 0);
    setPotentialReturn(prettyDisplayNumber(new BigNumber(newPotentialReturn))); //trim(newPotentialReturn, 2));
  }, [inputDays, inputApy, inputFinalPrice, inputInitialShec]);

  return (
    <div className="calculator-view">
      <Zoom in={true}>
        <Paper className="hec-card calculator-card">
          <Grid className="calculator-card-grid" container direction="column" spacing={2}>
            <Grid item>
              <Box className="calculator-card-header">
                <Typography variant="h5">Calculator</Typography>
                <Typography variant="body2">Estimate your returns</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box className="calculator-card-metrics">
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4} md={4} lg={4}>
                    <Box className="calculator-card-apy">
                      <Typography variant="h5" color="textSecondary">
                        HEC Price
                      </Typography>
                      <Typography variant="h4">
                        {isAppLoading ? (
                          <Skeleton width="100px" />
                        ) : (
                          `$${prettyDisplayNumber(new BigNumber(marketPrice))}`
                        )}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={4} md={4} lg={4}>
                    <Box className="calculator-card-tvl">
                      <Typography variant="h5" color="textSecondary">
                        Current APY
                      </Typography>
                      <Typography variant="h4">
                        {isAppLoading ? (
                          <Skeleton width="100px" />
                        ) : (
                          <>{prettyDisplayNumber(new BigNumber(stakingApy * 100))}%</>
                        )}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={4} md={4} lg={4}>
                    <Box className="calculator-card-index">
                      <Typography variant="h5" color="textSecondary">
                        Your sHEC Balance
                      </Typography>
                      <Typography variant="h4">
                        {isAppLoading ? <Skeleton width="100px" /> : <>{shecBalance} sHEC</>}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Grid>

            <Box className="calculator-card-area">
              <Box>
                <Box className="calculator-card-action-area">
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Box className="calculator-card-action-area-inp-wrap">
                        <Typography variant="h6">sHEC Amount</Typography>
                        <OutlinedInput
                          type="number"
                          placeholder="Amount"
                          className="calculator-card-action-input"
                          value={inputInitialShec}
                          onChange={e => setInputInitialShec(e.target.value)}
                          labelWidth={0}
                          endAdornment={
                            <InputAdornment position="end">
                              <div
                                onClick={() => setInputInitialShec(shecBalance.toString())}
                                className="stake-card-action-input-btn"
                              >
                                <Typography>Max</Typography>
                              </div>
                            </InputAdornment>
                          }
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box className="calculator-card-action-area-inp-wrap">
                        <Typography variant="h6">APY (%)</Typography>
                        <OutlinedInput
                          type="number"
                          placeholder="Amount"
                          className="calculator-card-action-input"
                          value={inputApy}
                          onChange={e => setInputApy(e.target.value)}
                          labelWidth={0}
                          endAdornment={
                            <InputAdornment position="end">
                              <div
                                onClick={() => setInputApy(prettyInputNumber(new BigNumber(stakingApy * 100)))}
                                className="stake-card-action-input-btn"
                              >
                                <Typography>Current</Typography>
                              </div>
                            </InputAdornment>
                          }
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box className="calculator-card-action-area-inp-wrap">
                        <Typography variant="h6">HEC price at purchase ($)</Typography>
                        <OutlinedInput
                          type="number"
                          placeholder="Amount"
                          className="calculator-card-action-input"
                          value={inputInitialPrice}
                          onChange={e => setInputInitialPrice(e.target.value)}
                          labelWidth={0}
                          endAdornment={
                            <InputAdornment position="end">
                              <div
                                onClick={() => setInputInitialPrice(prettyInputNumber(new BigNumber(marketPrice)))}
                                className="stake-card-action-input-btn"
                              >
                                <Typography>Current</Typography>
                              </div>
                            </InputAdornment>
                          }
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box className="calculator-card-action-area-inp-wrap">
                        <Typography variant="h6">Future HEC market price ($)</Typography>
                        <OutlinedInput
                          type="number"
                          placeholder="Amount"
                          className="calculator-card-action-input"
                          value={inputFinalPrice}
                          onChange={e => setInputFinalPrice(e.target.value)}
                          labelWidth={0}
                          endAdornment={
                            <InputAdornment position="end">
                              <div
                                onClick={() => setInputFinalPrice(prettyInputNumber(new BigNumber(marketPrice)))}
                                className="stake-card-action-input-btn"
                              >
                                <Typography>Current</Typography>
                              </div>
                            </InputAdornment>
                          }
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
                <Box className="calculator-days-slider-wrap">
                  <Typography>{`${inputDays} day${inputDays > 1 ? "s" : ""}`}</Typography>
                  <Slider
                    className="calculator-days-slider"
                    min={1}
                    max={365}
                    value={inputDays}
                    onChange={(e, days) => {
                      if (Array.isArray(days)) {
                        return;
                      }
                      setInputDays(days);
                    }}
                  />
                </Box>
                <Box className="calculator-user-data">
                  <Box className="data-row">
                    <Typography>Initial balance</Typography>
                    <Typography>
                      {isAppLoading ? (
                        <Skeleton width="80px" />
                      ) : (
                        <>
                          <span className="currency-hec">{inputInitialShec} HEC</span> ={" "}
                          <span className="currency-usd">${initialUsd}</span>
                        </>
                      )}
                    </Typography>
                  </Box>
                  <Box className="data-row">
                    <Typography>Final balance after {inputDays} days</Typography>
                    <Typography>
                      {isAppLoading ? (
                        <Skeleton width="80px" />
                      ) : (
                        <>
                          <span className="currency-hec">{rewardsEstimation} HEC</span> ={" "}
                          <span className="currency-usd">${potentialReturn}</span>
                        </>
                      )}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Paper>
      </Zoom>
    </div>
  );
}

export default Calculator;
