import type { FC } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ChartDataPoint } from '../../services/coingeckoService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PriceChartProps {
  data: ChartDataPoint[];
  coinName: string;
  coinSymbol: string;
  timeRange: string;
}

const PriceChart: FC<PriceChartProps> = ({ 
  data, 
  coinName, 
  coinSymbol, 
  timeRange
}) => {
  // Format data for Chart.js
  const chartData = {
    labels: data.map(point => {
      const date = new Date(point.timestamp);
      if (timeRange === '24h') {
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      } else if (timeRange === '7d') {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      } else if (timeRange === '1m') {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      } else {
        return date.toLocaleDateString('en-US', { 
          year: '2-digit',
          month: 'short' 
        });
      }
    }),
    datasets: [
      {
        label: `${coinName} Price`,
        data: data.map(point => point.price),
        borderColor: '#374151', // Dark grey for uniformity
        backgroundColor: 'rgba(55, 65, 81, 0.1)', // Light grey fill
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: '#374151',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context: any) => {
            const dataIndex = context[0].dataIndex;
            const timestamp = data[dataIndex]?.timestamp;
            if (timestamp) {
              const date = new Date(timestamp);
              return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
            }
            return '';
          },
          label: (context: any) => {
            const value = context.parsed.y;
            return `${coinSymbol.toUpperCase()}: $${value.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: value >= 1 ? 4 : 8,
            })}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
          },
          maxTicksLimit: timeRange === '24h' ? 6 : 8,
        },
        border: {
          display: false,
        },
      },
      y: {
        display: true,
        position: 'right' as const,
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
          },
          callback: function(value: any) {
            const num = parseFloat(value);
            if (num >= 1000000) {
              return `$${(num / 1000000).toFixed(1)}M`;
            } else if (num >= 1000) {
              return `$${(num / 1000).toFixed(1)}K`;
            } else if (num >= 1) {
              return `$${num.toFixed(2)}`;
            } else {
              return `$${num.toFixed(6)}`;
            }
          },
        },
        border: {
          display: false,
        },
      },
    },
    elements: {
      point: {
        hoverRadius: 6,
      },
    },
  };

  return (
    <div className="relative h-96 w-full">
      <Line data={chartData} options={options} />
      
      {/* Kemi Branding - Center Middle */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center space-x-1 opacity-30 pointer-events-none">
        <span className="text-xs font-medium text-gray-500">Powered by</span>
        <span className="text-xs font-bold text-gray-700">Kemi Crypto</span>
      </div>

    </div>
  );
};

export default PriceChart;