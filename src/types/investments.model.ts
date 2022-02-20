interface Proposal {
    id: string;
    link: string;
    title: string;
    start: number;
    end: number;
    snapshot: string;
}

export interface TokenDetail {
    token: string;
    ticker: string;
    logo?: string | React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
    buyBack: string;
    price: string;
    burn: string;
}

interface Investment {
    tokenDetails: TokenDetail[];
    transactionLinks: string[];
    transactionDate: string;
    investedAmount: string;
}

export interface Transaction {
    proposal: Proposal;
    type: 'Buyback-Burn' | 'Investment' | 'Marketing';
    title: string;
    investments: Investment;
}

export interface AllInvestments {
    transactions: Transaction[];
    assetsUM?: any;
}

export interface FTMScanTransaction {
    blockHash: string;
    blockNumber: string;
    confirmations: string;
    contractAddress: string;
    cumulativeGasUsed: string;
    from: string;
    gas: string;
    gasPrice: string;
    gasUsed: string;
    hash: string;
    input: string;
    nonce: string;
    timeStamp: string;
    to: string;
    tokenDecimal: string;
    tokenName: string;
    tokenSymbol: string;
    transactionIndex: string;
    value: string;
}