import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { stockApi } from '../services/stockApi';
import type { StockSymbol } from '../services/stockApi';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  AlertTitle,
  ToggleButton,
  ToggleButtonGroup,
  Button,
} from '@mui/material';
import { Add as AddIcon, ShowChart as ChartIcon, TableChart as TableIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  history: { date: string; price: number }[];
}

type ViewMode = 'chart' | 'table';

interface InvestmentPortfolioProps {
  symbols?: string[];
  showHeader?: boolean;
  maxItems?: number;
}

export default function InvestmentPortfolio({ 
  symbols: initialSymbols = [], 
  showHeader = true,
  maxItems = 10
}: InvestmentPortfolioProps) {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(new Set(initialSymbols));
  const navigate = useNavigate();

  // Fetch stock data when selected symbols change
  useEffect(() => {
    const fetchStockData = async () => {
      if (selectedSymbols.size === 0) {
        setStocks([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Convert Set to array of symbols
        const symbols = Array.from(selectedSymbols);
        
        // Fetch stock quotes
        const quotes = await stockApi.getStockPrices(symbols);
        
        // Transform data to match our StockData interface
        const stockData = Object.entries(quotes).map(([symbol, quote]) => ({
          symbol,
          name: symbol, // We'll update this with actual names later
          price: quote.price,
          change: quote.change,
          change_percent: quote.change_percent,
          history: quote.history?.map(h => ({
            date: new Date(h.date).toLocaleDateString(),
            price: h.price
          })) || []
        }));

        setStocks(stockData);
      } catch (err) {
        console.error('Error fetching stock data:', err);
        setError('Failed to load stock data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
  }, [selectedSymbols]);

  // Handle adding/removing symbols
  const handleToggleSymbol = (symbol: string) => {
    setSelectedSymbols(prev => {
      const newSet = new Set(prev);
      if (newSet.has(symbol)) {
        newSet.delete(symbol);
      } else {
        newSet.add(symbol);
      }
      return newSet;
    });
  };

  // Handle view mode toggle
  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  // Navigate to stock browser
  const handleAddStocks = () => {
    navigate('/stocks');
  };

  // Calculate portfolio performance
  const totalValue = stocks.reduce((sum, stock) => sum + stock.price, 0);
  const totalChange = stocks.reduce((sum, stock) => sum + stock.change, 0);
  const totalChangePercent = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;

  // Sort stocks by value (highest first)
  const sortedStocks = [...stocks].sort((a, b) => b.price - a.price);
  const displayedStocks = maxItems ? sortedStocks.slice(0, maxItems) : sortedStocks;

  if (loading && stocks.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <AlertTitle>Error</AlertTitle>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {showHeader && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">Investment Portfolio</Typography>
          <Box>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              aria-label="view mode"
              size="small"
              sx={{ mr: 2 }}
            >
              <ToggleButton value="table" aria-label="table view">
                <TableIcon />
              </ToggleButton>
              <ToggleButton value="chart" aria-label="chart view">
                <ChartIcon />
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddStocks}
            >
              Add Investments
            </Button>
          </Box>
        </Box>
      )}

      {stocks.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No investments added yet
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddStocks}
              sx={{ mt: 2 }}
            >
              Browse Stocks
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'chart' ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Portfolio Performance
            </Typography>
            <Box height={400}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stocks.flatMap(stock => 
                    stock.history.map(point => ({
                      date: point.date,
                      [stock.symbol]: point.price
                    }))
                  )}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {stocks.map(stock => (
                    <Line
                      key={stock.symbol}
                      type="monotone"
                      dataKey={stock.symbol}
                      stroke={`#${Math.floor(Math.random()*16777215).toString(16)}`}
                      activeDot={{ r: 8 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Change</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedStocks.map((stock) => (
                <TableRow key={stock.symbol}>
                  <TableCell>
                    <Typography fontWeight="bold">{stock.symbol}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {stock.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(stock.price, 'INR')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)} (${stock.change_percent.toFixed(2)}%)`}
                      color={stock.change >= 0 ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {formatCurrency(stock.price, 'INR')}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleToggleSymbol(stock.symbol)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {stocks.length > 0 && (
        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="textSecondary">
            Showing {displayedStocks.length} of {stocks.length} investments
          </Typography>
          {maxItems && stocks.length > maxItems && (
            <Button onClick={() => navigate('/portfolio')}>
              View All Investments
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}

import { formatCurrency } from '../utils/currency';