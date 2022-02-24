import axios from "axios";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import GlobalInfo from "src/components/investments/global-info/global-info";
import LatestTransactions from "src/components/investments/latest-transactions/latest-transactions";
import InvestmentsPieChart from "src/components/investments/pie-chart/investments-pie-chart";
import { loadTreasuryInvestments } from "src/slices/AppSlice";
import { RootState } from "src/store";
import { FTMScanTransaction } from "src/types/investments.model";
import "./investments.scss";

export default function Investments() {
  const dispatch = useDispatch();
  const { transactions } = useSelector((state: RootState) => state.app.allInvestments);
  const [ftmScanTransactionData, setTransactionData] = useState<FTMScanTransaction[][]>();
  const isLoading = useSelector((state: RootState) => state.app.isLoadingInvestments);

  async function getTransactionData() {
    const { result }: { result: FTMScanTransaction[] } = await axios
      .get(
        "https://api.ftmscan.com/api?module=account&action=tokentx&address=0xD3Ea3b2313d24e0f2302b21f04D0F784CDb6389B&page=1&offset=100&sort=desc&apikey=HEB98UTKTRQYD7R4UG383BNGJZ82B4M1E8",
      )
      .then(ftmData => ftmData.data);
    const uniqueBlocks = Array.from(new Set(result.map(transactions => transactions.blockNumber)));
    // use only latest transactions without the last one to avoid missing data
    // transactions are grouped by block number (cant garuntee with the offset we have)
    uniqueBlocks.pop();
    const groupedData = uniqueBlocks.map(blockNumber =>
      result.filter(transaction => transaction.blockNumber === blockNumber),
    );
    setTransactionData(groupedData);
  }

  useEffect(() => {
    dispatch(loadTreasuryInvestments());
    getTransactionData();
  }, []);

  return (
    <div className="investment-dash">
      <GlobalInfo isLoading={isLoading} transactions={transactions} />
      <InvestmentsPieChart />
      {transactions && ftmScanTransactionData && (
        <LatestTransactions
          isLoading={isLoading}
          ftmScanTransactionData={ftmScanTransactionData}
          transactions={transactions}
        />
      )}
    </div>
  );
}
