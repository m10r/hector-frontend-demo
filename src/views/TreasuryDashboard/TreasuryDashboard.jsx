import { useEffect, useState } from "react";
import { Paper, Grid, Typography, Box, Zoom, Container, useMediaQuery } from "@material-ui/core";
import { Skeleton } from "@material-ui/lab";
import { useSelector } from "react-redux";
import Chart from "../../components/Chart/Chart.jsx";
import { trim, formatCurrency } from "../../helpers";
import {
  treasuryDataQuery,
  rebasesV1DataQuery,
  bulletpoints,
  tooltipItems,
  tooltipInfoMessages,
  itemType,
  torQuery,
  ethMetricsQuery,
} from "./treasuryData.js";
import { useTheme } from "@material-ui/core/styles";
import "./treasury-dashboard.scss";
import apollo from "../../lib/apolloClient";
import InfoTooltip from "src/components/InfoTooltip/InfoTooltip.jsx";
import { prettyDisplayNumber } from "src/helpers";
import BigNumber from "bignumber.js";
import { ETH_GRAPH_URL } from "src/constants.ts";

function TreasuryDashboard() {
  const [data, setData] = useState(null);
  const [convexPool, setConvexPool] = useState();
  const [apy, setApy] = useState([]);
  const [runway, setRunway] = useState(null);
  const [hecSupply, setHecSupply] = useState(null);
  const [staked, setStaked] = useState(null);
  const theme = useTheme();
  const smallerScreen = useMediaQuery("(max-width: 650px)");
  const verySmallScreen = useMediaQuery("(max-width: 379px)");

  const marketPrice = useSelector(state => {
    return state.app.marketPrice;
  });
  const circSupply = useSelector(state => {
    return state.app.circSupply;
  });
  const totalSupply = useSelector(state => {
    return state.app.totalSupply;
  });
  const marketCap = useSelector(state => {
    return state.app.marketCap;
  });
  const currentIndex = useSelector(state => {
    return state.app.currentIndex;
  });
  const rebase = useSelector(state => {
    return state.app.stakingRebase;
  });
  const backingPerHec = useSelector(state => state.app.treasuryMarketValue / circSupply);

  const wsHecPrice = useSelector(state => {
    return state.app.marketPrice * state.app.currentIndex;
  });

  async function getGraphData() {
    const ethData = await apollo(ethMetricsQuery, ETH_GRAPH_URL).then(res => {
      setConvexPool(res.data.ethMetrics);
      return res.data.ethMetrics;
    });
    await apollo(treasuryDataQuery).then(r => {
      let metrics = r?.data?.protocolMetrics.map((entry, i) => {
        const obj = Object.entries(entry).reduce((obj, [key, value]) => ((obj[key] = parseFloat(value)), obj), {});
        const bankTotal = obj.bankBorrowed + obj.bankSupplied;
        const torTimeStamp = 1642857253;
        let data = {
          ...obj,
          bankTotal,
          torTVL: +obj.timestamp > torTimeStamp ? r?.data?.tors[i].torTVL : 0,
        };
        if (i < ethData?.length) {
          data = { ...data, treasuryBaseRewardPool: +ethData[i].treasuryBaseRewardPool };
        }
        return data;
      });
      let staked = r?.data?.protocolMetrics.map(entry => ({
        staked: (parseFloat(entry.sHecCirculatingSupply) / parseFloat(entry.hecCirculatingSupply)) * 100,
        timestamp: entry.timestamp,
      }));

      if (staked) {
        staked = staked.filter(pm => pm.staked < 100);
        setStaked(staked);
      }

      if (metrics) {
        metrics = metrics.filter(pm => pm.treasuryMarketValue > 0);
        setData(metrics);
        const runway = metrics.filter(pm => pm.runwayCurrent > 5);
        setRunway(runway);
        const supply = metrics.filter(pm => pm.hecCirculatingSupply > 0);
        setHecSupply(supply);
      }
    });
  }

  useEffect(() => {
    getGraphData();

    apollo(rebasesV1DataQuery).then(r => {
      let apy = r?.data?.rebases.map(entry => ({
        apy: Math.pow(parseFloat(entry.percentage) + 1, 365 * 3) * 100,
        timestamp: entry.timestamp - (entry.timestamp % (3600 * 4)),
      }));
      if (apy) {
        apy = apy.filter(pm => pm.apy < 5000000);
        setApy(apy);
      }
    });
  }, []);

  return (
    <div id="treasury-dashboard-view" className={`${smallerScreen && "smaller"} ${verySmallScreen && "very-small"}`}>
      <Container
        style={{
          paddingLeft: smallerScreen || verySmallScreen ? "0" : "3.3rem",
          paddingRight: smallerScreen || verySmallScreen ? "0" : "3.3rem",
        }}
      >
        <Box className={`hero-metrics`}>
          <Paper className="hec-card">
            <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="center">
              <Box className="metric market">
                <Typography variant="h6" color="textSecondary">
                  Market Cap
                </Typography>
                <Typography variant="h5">
                  {marketCap && formatCurrency(marketCap, 0)}
                  {!marketCap && <Skeleton type="text" />}
                </Typography>
              </Box>

              <Box className="metric price">
                <Typography variant="h6" color="textSecondary">
                  HEC Price
                </Typography>
                <Typography variant="h5">
                  {/* appleseed-fix */}
                  {marketPrice ? formatCurrency(marketPrice, 2) : <Skeleton type="text" />}
                </Typography>
              </Box>

              <Box className="metric wsoprice">
                <Typography variant="h6" color="textSecondary">
                  wsHEC Price
                  <InfoTooltip
                    message={
                      "wsHEC = sHEC * index\n\nThe price of wsHEC is equal to the price of HEC multiplied by the current index"
                    }
                  />
                </Typography>

                <Typography variant="h5">
                  {wsHecPrice ? formatCurrency(wsHecPrice, 2) : <Skeleton type="text" />}
                </Typography>
              </Box>

              <Box className="metric circ">
                <Typography variant="h6" color="textSecondary">
                  Circulating Supply (total)
                </Typography>
                <Typography variant="h5">
                  {circSupply && totalSupply ? (
                    parseInt(circSupply) + " / " + parseInt(totalSupply)
                  ) : (
                    <Skeleton type="text" />
                  )}
                </Typography>
              </Box>

              <Box className="metric bpo">
                <Typography variant="h6" color="textSecondary">
                  RPH
                  <InfoTooltip message={"RPH is the amount of Reserves per HEC that our Treasury is holding."} />
                </Typography>
                <Typography variant="h5">
                  {backingPerHec ? formatCurrency(backingPerHec, 2) : <Skeleton type="text" />}
                </Typography>
              </Box>

              <Box className="metric index">
                <Typography variant="h6" color="textSecondary">
                  Current Index
                  <InfoTooltip
                    message={
                      "The current index tracks the amount of sHEC accumulated since the beginning of staking. Basically, how much sHEC one would have if they staked and held a single HEC from day 1."
                    }
                  />
                </Typography>
                <Typography variant="h5">
                  {currentIndex ? trim(currentIndex, 2) + " sHEC" : <Skeleton type="text" />}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>

        <Zoom in={true}>
          <Grid container spacing={2} className="data-grid">
            <Grid item lg={6} md={6} sm={12} xs={12}>
              <Paper className="hec-card hec-chart-card">
                <Chart
                  type="stack"
                  data={data}
                  dataKey={bulletpoints.tvl.map(coin => coin.marketValue)}
                  stopColor={bulletpoints.tvl.map(coin => coin.stopColor)}
                  headerText="Total Value Deposited"
                  headerSubText={`${
                    data && formatCurrency(+data[0].totalValueLocked + +convexPool[0].treasuryBaseRewardPool)
                  }`}
                  bulletpointColors={bulletpoints.tvl}
                  itemNames={bulletpoints.tvl.map(coin => coin.name)}
                  itemType={itemType.dollar}
                  infoTooltipMessage={tooltipInfoMessages.tvl}
                  expandedGraphStrokeColor={theme.palette.graphStrokeColor}
                />
              </Paper>
            </Grid>

            <Grid item lg={6} md={6} sm={12} xs={12}>
              <Paper className="hec-card hec-chart-card">
                <Chart
                  type="stack"
                  data={data}
                  dataKey={bulletpoints.coin.map(coin => coin.marketValue)}
                  stopColor={bulletpoints.coin.map(coin => coin.stopColor)}
                  headerText="Market Value of Treasury Assets"
                  headerSubText={`${data && formatCurrency(data[0].treasuryMarketValue)}`}
                  bulletpointColors={bulletpoints.coin}
                  itemNames={bulletpoints.coin.map(coin => coin.name)}
                  itemType={itemType.dollar}
                  infoTooltipMessage={tooltipInfoMessages.mvt}
                  expandedGraphStrokeColor={theme.palette.graphStrokeColor}
                />
              </Paper>
            </Grid>

            <Grid item lg={6} md={6} sm={12} xs={12}>
              <Paper className="hec-card hec-chart-card">
                <Chart
                  type="stack"
                  data={data}
                  format="currency"
                  dataKey={bulletpoints.coin.filter(coin => coin.riskFree).map(coin => coin.riskFree)}
                  stopColor={bulletpoints.coin.map(coin => coin.stopColor)}
                  headerText="Risk Free Value of Treasury Assets"
                  headerSubText={`${data && formatCurrency(data[0].treasuryRiskFreeValue)}`}
                  bulletpointColors={bulletpoints.coin}
                  itemNames={bulletpoints.coin.filter(coin => coin.riskFree).map(coin => coin.name)}
                  itemType={itemType.dollar}
                  infoTooltipMessage={tooltipInfoMessages.rfv}
                  expandedGraphStrokeColor={theme.palette.graphStrokeColor}
                />
              </Paper>
            </Grid>

            <Grid item lg={6} md={6} sm={12} xs={12}>
              <Paper className="hec-card hec-chart-card">
                <Chart
                  type="area"
                  data={hecSupply}
                  dataKey={["hecCirculatingSupply"]}
                  stopColor={[["#ED994C", "#77431E"]]}
                  headerText="HEC Circulating Supply"
                  headerSubText={`${data && prettyDisplayNumber(new BigNumber(data[0].hecCirculatingSupply))} HEC`}
                  dataFormat="hec"
                  bulletpointColors={bulletpoints.supply}
                  itemNames={tooltipItems.supply}
                  itemType={""}
                  infoTooltipMessage={tooltipInfoMessages.supply}
                  expandedGraphStrokeColor={theme.palette.graphStrokeColor}
                />
              </Paper>
            </Grid>

            <Grid item lg={6} md={6} sm={12} xs={12}>
              <Paper className="hec-card hec-chart-card">
                <Chart
                  type="area"
                  data={staked}
                  dataKey={["staked"]}
                  stopColor={[["#55EBC7", "#47ACEB"]]}
                  headerText="HEC Staked"
                  dataFormat="percent"
                  headerSubText={`${staked && trim(staked[0].staked, 2)}% `}
                  isStaked={true}
                  bulletpointColors={bulletpoints.staked}
                  infoTooltipMessage={tooltipInfoMessages.staked}
                  expandedGraphStrokeColor={theme.palette.graphStrokeColor}
                />
              </Paper>
            </Grid>

            <Grid item lg={6} md={6} sm={12} xs={12}>
              <Paper className="hec-card hec-chart-card">
                <Chart
                  type="line"
                  data={runway}
                  dataKey={["runwayCurrent"]}
                  color={theme.palette.text.primary}
                  stroke={[theme.palette.text.primary]}
                  headerText="Runway Available"
                  headerSubText={`${data && trim(data[0].runwayCurrent, 1)} Days`}
                  dataFormat="days"
                  bulletpointColors={bulletpoints.runway}
                  itemNames={tooltipItems.runway}
                  itemType={""}
                  infoTooltipMessage={tooltipInfoMessages.runway}
                  expandedGraphStrokeColor={theme.palette.graphStrokeColor}
                />
              </Paper>
            </Grid>

            <Grid item lg={6} md={6} sm={12} xs={12}>
              <Paper className="hec-card hec-chart-card">
                <Chart
                  type="area"
                  data={data}
                  dataKey={["treasuryHecDaiPOL"]}
                  stopColor={[["rgba(128, 204, 131, 1)", "rgba(128, 204, 131, 0)"]]}
                  headerText="Protocol Owned Liquidity HEC-DAI"
                  headerSubText={`${data && trim(data[0].treasuryHecDaiPOL, 2)}% `}
                  dataFormat="percent"
                  bulletpointColors={bulletpoints.pol}
                  itemNames={tooltipItems.pol}
                  itemType={itemType.percentage}
                  infoTooltipMessage={tooltipInfoMessages.pol}
                  expandedGraphStrokeColor={theme.palette.graphStrokeColor}
                  isPOL={true}
                />
              </Paper>
            </Grid>
          </Grid>
        </Zoom>
      </Container>
    </div>
  );
}

export function TorSupplyChart() {
  const [torHistory, setTorHistory] = useState(null);
  const [torSupply, setTorSupply] = useState(null);
  const theme = useTheme();
  useEffect(() => {
    apollo(torQuery).then(r => {
      if (!r?.data?.tors) {
        return;
      }
      const tors = r?.data?.tors.map(({ timestamp, supply }) => ({
        timestamp: parseFloat(timestamp),
        supply: parseFloat(supply),
      }));
      setTorHistory(tors);
      setTorSupply(tors);
    });
  }, []);

  return (
    <Chart
      type="area"
      data={torSupply}
      dataKey={["supply"]}
      stopColor={[["#F9F9F9", "#C1C1C1"]]}
      headerText="TOR Circulating Supply"
      headerSubText={`${torHistory && prettyDisplayNumber(new BigNumber(torHistory[0].supply))} TOR`}
      dataFormat="hec"
      bulletpointColors={bulletpoints.torSupply}
      itemNames={tooltipItems.torSupply}
      itemType={""}
      infoTooltipMessage={tooltipInfoMessages.torSupply}
      expandedGraphStrokeColor={theme.palette.graphStrokeColor}
      stroke="#C1C1C1"
    />
  );
}

export default TreasuryDashboard;
