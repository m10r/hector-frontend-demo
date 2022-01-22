import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  LineChart,
  AreaChart,
  Area,
  Legend,
} from "recharts";

import "./line-chart.scss";

interface ProjectionData {
  name: string;
  amount: number;
}

interface ProjectionProps {
  apr: number;
  quantity: number;
}

export default function ProjectionLineChart({ apr, quantity }: ProjectionProps) {
  const data: ProjectionData[] = [];
  const monthlyInterestRate = apr / 100 / 12;
  let balance = quantity;
  for (let i = 0; i < 12; i++) {
    balance += balance * monthlyInterestRate;
    if (!(i % 2 === 0)) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      data.push({ name: date.toLocaleDateString(), amount: balance });
    }
  }

  const renderLegend = () => {
    return <div>Based on current APR</div>;
  };

  return (
    <div className="chart">
      <ResponsiveContainer>
        <AreaChart
          data={data}
          syncId="anyId"
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Legend content={renderLegend} />
          <Tooltip />
          <Area type="monotone" dataKey="amount" stroke="#657C69" fill="#7FA886" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
