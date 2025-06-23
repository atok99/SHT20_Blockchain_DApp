import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Line } from 'react-chartjs-2';
import { 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Button, 
  CircularProgress, 
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  Avatar,
  TextField,
  Slider
} from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  AccountBalanceWallet,
  Settings as SettingsIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import CoffeeIcon from '@mui/icons-material/Coffee';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TableChartIcon from '@mui/icons-material/TableChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff88',
    },
    secondary: {
      main: '#00b4ff',
    },
    background: {
      default: '#0a0a0a',
      paper: '#121212',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
});

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const contractABI = [ 
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "id", "type": "uint256"},
      {"indexed": false, "internalType": "string", "name": "sensorId", "type": "string"},
      {"indexed": false, "internalType": "string", "name": "location", "type": "string"},
      {"indexed": false, "internalType": "string", "name": "processStage", "type": "string"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"},
      {"indexed": false, "internalType": "int256", "name": "temperature", "type": "int256"},
      {"indexed": false, "internalType": "uint256", "name": "humidity", "type": "uint256"}
    ],
    "name": "NewReading",
    "type": "event"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "_sensorId", "type": "string"},
      {"internalType": "string", "name": "_location", "type": "string"},
      {"internalType": "string", "name": "_processStage", "type": "string"},
      {"internalType": "uint256", "name": "_timestamp", "type": "uint256"},
      {"internalType": "int256", "name": "_temperature", "type": "int256"},
      {"internalType": "uint256", "name": "_humidity", "type": "uint256"}
    ],
    "name": "addReading",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getReadingCount",
    "outputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {"internalType": "address", "name": "", "type": "address"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "sensorReadings",
    "outputs": [
      {"internalType": "string", "name": "sensorId", "type": "string"},
      {"internalType": "string", "name": "location", "type": "string"},
      {"internalType": "string", "name": "processStage", "type": "string"},
      {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
      {"internalType": "int256", "name": "temperature", "type": "int256"},
      {"internalType": "uint256", "name": "humidity", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function App() {
  const [sensorData, setSensorData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [blockchainStatus, setBlockchainStatus] = useState({
    connected: false,
    message: 'Not connected to blockchain',
    error: null
  });
  const [lastRefresh, setLastRefresh] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [tempSetpoint, setTempSetpoint] = useState({ min: 24, max: 30 });
  const [humSetpoint, setHumSetpoint] = useState({ min: 50, max: 70 });
  const [tempInput, setTempInput] = useState({ min: 24, max: 30 });
  const [humInput, setHumInput] = useState({ min: 50, max: 70 });
  const [monitoringStartTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const refreshIntervalRef = useRef();

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const diff = now - monitoringStartTime;
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setElapsedTime({ days, hours, minutes, seconds });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [monitoringStartTime]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTempChange = (field, value) => {
    setTempInput(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? value : Number(value)
    }));
  };

  const handleHumChange = (field, value) => {
    setHumInput(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? value : Number(value)
    }));
  };

  const handleTempSliderChange = (event, newValue) => {
    setTempInput({
      min: newValue[0],
      max: newValue[1]
    });
  };

  const handleHumSliderChange = (event, newValue) => {
    setHumInput({
      min: newValue[0],
      max: newValue[1]
    });
  };

  const submitSetpoints = () => {
    const newTemp = {
      min: typeof tempInput.min === 'string' ? parseFloat(tempInput.min) : tempInput.min,
      max: typeof tempInput.max === 'string' ? parseFloat(tempInput.max) : tempInput.max
    };
    
    const newHum = {
      min: typeof humInput.min === 'string' ? parseFloat(humInput.min) : humInput.min,
      max: typeof humInput.max === 'string' ? parseFloat(humInput.max) : humInput.max
    };

    setTempSetpoint(newTemp);
    setHumSetpoint(newHum);
  };

  const connectToBlockchain = async () => {
    try {
      setBlockchainStatus({
        connected: false,
        message: 'Connecting to blockchain...',
        error: null
      });

      if (!window.ethereum) {
        throw new Error("Please install MetaMask!");
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      const contractInstance = new ethers.Contract(contractAddress, contractABI, signer);
      
      const owner = await contractInstance.owner();
      
      setAccount(address);
      setContract(contractInstance);
      
      setBlockchainStatus({
        connected: true,
        message: `Connected as ${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
        error: null
      });
      
      return contractInstance;
    } catch (error) {
      console.error("Blockchain connection error:", error);
      setBlockchainStatus({
        connected: false,
        message: 'Failed to connect to blockchain',
        error: error.message
      });
      throw error;
    }
  };

  const fetchData = async (contractInstance) => {
    setLoading(true);
    try {
      const count = await contractInstance.getReadingCount();
      const data = [];

      for (let i = 0; i < count; i++) {
        const reading = await contractInstance.sensorReadings(i);

        data.push({
          id: i,
          sensorId: reading.sensorId,
          location: reading.location,
          processStage: reading.processStage,
          timestamp: new Date(Number(reading.timestamp) * 1000),
          temperature: Number(reading.temperature) / 10,
          humidity: Number(reading.humidity) / 10,
        });
      }

      setSensorData(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error fetching data:", error);
      setBlockchainStatus(prev => ({
        ...prev,
        message: 'Error fetching data from blockchain',
        error: error.message
      }));
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      const contractInstance = contract || await connectToBlockchain();
      await fetchData(contractInstance);
    } catch (error) {
      console.error("Refresh error:", error);
    }
  };

  useEffect(() => {
    refreshData();
    refreshIntervalRef.current = setInterval(refreshData, 10000);
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const calculate24hChange = () => {
    if (sensorData.length < 2) return { tempChange: 0, humChange: 0 };
    
    const now = sensorData[sensorData.length - 1];
    const twentyFourHoursAgo = sensorData.find(item => 
      (now.timestamp - item.timestamp) <= 24 * 60 * 60 * 1000
    ) || sensorData[0];
    
    const tempChange = ((now.temperature - twentyFourHoursAgo.temperature) / twentyFourHoursAgo.temperature) * 100;
    const humChange = ((now.humidity - twentyFourHoursAgo.humidity) / twentyFourHoursAgo.humidity) * 100;
    
    return {
      tempChange: parseFloat(tempChange.toFixed(2)),
      humChange: parseFloat(humChange.toFixed(2))
    };
  };

  const { tempChange, humChange } = calculate24hChange();

  const temperatureData = {
    labels: sensorData.map(d => d.timestamp.toLocaleTimeString()),
    datasets: [
      {
        label: 'Temperature (°C)',
        data: sensorData.map(d => d.temperature),
        borderColor: '#00ff88',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        pointBackgroundColor: '#00ff88',
        fill: true
      },
      {
        label: 'Max Temperature',
        data: sensorData.map(() => tempSetpoint.max),
        borderColor: 'rgba(255, 107, 107, 0.7)',
        backgroundColor: 'rgba(255, 107, 107, 0.05)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      },
      {
        label: 'Min Temperature',
        data: sensorData.map(() => tempSetpoint.min),
        borderColor: 'rgba(255, 214, 0, 0.7)',
        backgroundColor: 'rgba(255, 214, 0, 0.05)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: 1
      }
    ]
  };

  const humidityData = {
    labels: sensorData.map(d => d.timestamp.toLocaleTimeString()),
    datasets: [
      {
        label: 'Humidity (%)',
        data: sensorData.map(d => d.humidity),
        borderColor: '#00b4ff',
        backgroundColor: 'rgba(0, 180, 255, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        pointBackgroundColor: '#00b4ff',
        fill: true
      },
      {
        label: 'Max Humidity',
        data: sensorData.map(() => humSetpoint.max),
        borderColor: 'rgba(255, 107, 107, 0.7)',
        backgroundColor: 'rgba(255, 107, 107, 0.05)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      },
      {
        label: 'Min Humidity',
        data: sensorData.map(() => humSetpoint.min),
        borderColor: 'rgba(255, 214, 0, 0.7)',
        backgroundColor: 'rgba(255, 214, 0, 0.05)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#fff',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0,0,0,0.9)',
        titleColor: '#00ff88',
        bodyColor: '#fff',
        borderColor: '#00ff88',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.dataset.label.includes('Temperature') 
                ? `${context.parsed.y.toFixed(1)}°C` 
                : `${context.parsed.y.toFixed(1)}%`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255,255,255,0.05)'
        },
        ticks: {
          color: '#aaa'
        }
      },
      y: {
        grid: {
          color: 'rgba(255,255,255,0.05)'
        },
        ticks: {
          color: '#aaa',
          callback: function(value) {
            return this.getLabelForValue(value).includes('Temperature') 
              ? `${value}°C` 
              : `${value}%`;
          }
        }
      }
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ 
        backgroundColor: '#0a0a0a',
        minHeight: '100vh',
        color: '#fff',
        padding: 3
      }}>
        {/* Header Section */}
        <Box sx={{ 
          textAlign: 'center',
          mb: 4,
          pt: 2
        }}>
          <Typography variant="h3" sx={{ 
            fontWeight: 'bold',
            background: 'linear-gradient(90deg, #00ff88, #00b4ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
            letterSpacing: '2px'
          }}>
            STORAGE TANK CRUDE OIL MONITORING
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#aaa', letterSpacing: '1px' }}>
            Kelompok 10 - Crude Oil Monitoring
          </Typography>
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'center',
            gap: 3,
            mt: 2,
            mb: 3
          }}>
            <Chip 
              avatar={<Avatar sx={{ bgcolor: '#00ff88' }}>R</Avatar>}
              label="Rizal Khoirul Atok - 2042231013"
              variant="outlined"
              sx={{ color: '#00ff88' }}
            />
            <Chip 
              avatar={<Avatar sx={{ bgcolor: '#00b4ff' }}>M</Avatar>}
              label="Muhammad Emir Hakim Zauhari - 2042231069"
              variant="outlined"
              sx={{ color: '#00b4ff' }}
            />
            <Chip 
              avatar={<Avatar sx={{ bgcolor: '#ff6b6b' }}>D</Avatar>}
              label="Daffa Naufal Wahyuaji - 2042231081"
              variant="outlined"
              sx={{ color: '#ff6b6b' }}
            />
          </Box>
          <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />
        </Box>

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Full Width Container */}
          <Grid item xs={12} sx={{ width: '100%', padding: 0 }}>
            <Card sx={{ 
              width: '100%',
              margin: 0,
              backgroundColor: '#121212',
              border: '1px solid rgba(0, 255, 136, 0.2)',
              boxShadow: '0 0 15px rgba(0, 255, 136, 0.1)',
              borderRadius: 0,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' }
            }}>
              {/* Temperature Section */}
              <Box sx={{ flex: 1, p: 2 }}>
                <Typography variant="h6" sx={{ color: '#00ff88', mb: 2 }}>
                  Temperature Setpoint (°C)
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TextField
                    type="number"
                    value={tempInput.min}
                    onChange={(e) => handleTempChange('min', e.target.value)}
                    size="small"
                    sx={{ width: 120 }}
                    inputProps={{
                      step: "0.1",
                      min: 0,
                      max: tempInput.max - 0.1
                    }}
                  />
                  <Typography>to</Typography>
                  <TextField
                    type="number"
                    value={tempInput.max}
                    onChange={(e) => handleTempChange('max', e.target.value)}
                    size="small"
                    sx={{ width: 120 }}
                    inputProps={{
                      step: "0.1",
                      min: tempInput.min + 0.1,
                      max: 50
                    }}
                  />
                  <Slider
                    value={[tempInput.min, tempInput.max]}
                    onChange={handleTempSliderChange}
                    step={0.1}
                    min={0}
                    max={50}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value.toFixed(1)}°C`}
                    sx={{ flex: 1, mx: 2 }}
                  />
                </Box>
              </Box>

              {/* Humidity Section */}
              <Box sx={{ flex: 1, p: 2 }}>
                <Typography variant="h6" sx={{ color: '#00b4ff', mb: 2 }}>
                  Humidity Setpoint (%)
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TextField
                    type="number"
                    value={humInput.min}
                    onChange={(e) => handleHumChange('min', e.target.value)}
                    size="small"
                    sx={{ width: 120 }}
                    inputProps={{
                      step: "0.1",
                      min: 0,
                      max: humInput.max - 0.1
                    }}
                  />
                  <Typography>to</Typography>
                  <TextField
                    type="number"
                    value={humInput.max}
                    onChange={(e) => handleHumChange('max', e.target.value)}
                    size="small"
                    sx={{ width: 120 }}
                    inputProps={{
                      step: "0.1",
                      min: humInput.min + 0.1,
                      max: 100
                    }}
                  />
                  <Slider
                    value={[humInput.min, humInput.max]}
                    onChange={handleHumSliderChange}
                    step={0.1}
                    min={0}
                    max={100}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value.toFixed(1)}%`}
                    sx={{ flex: 1, mx: 2 }}
                  />
                </Box>
              </Box>

              {/* Apply Button */}
              <Box sx={{ p: 2, alignSelf: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<SaveIcon />}
                  onClick={submitSetpoints}
                  sx={{
                    backgroundColor: '#00b4ff',
                    '&:hover': { backgroundColor: '#0095ff' },
                    minWidth: 200,
                    height: 56
                  }}
                >
                  Update Setpoints
                </Button>
              </Box>
            </Card>
          </Grid>

          {/* Data Display Column */}
          <Grid item xs={12} md={9}>
            {/* Status Card */}
            <Card sx={{ 
              mb: 3, 
              backgroundColor: '#121212',
              border: '1px solid rgba(0, 255, 136, 0.2)',
              boxShadow: '0 0 15px rgba(0, 255, 136, 0.1)'
            }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center">
                    {blockchainStatus.connected ? (
                      <CheckCircleIcon sx={{ 
                        color: '#00ff88',
                        mr: 1 
                      }} />
                    ) : (
                      <ErrorIcon color="error" sx={{ mr: 1 }} />
                    )}
                    <Typography variant="body1">
                      {blockchainStatus.message}
                    </Typography>
                    {account && (
                      <Button
                        variant="outlined"
                        startIcon={<AccountBalanceWallet />}
                        sx={{ 
                          ml: 2,
                          color: '#00ff88',
                          borderColor: 'rgba(0, 255, 136, 0.5)',
                          '&:hover': {
                            borderColor: '#00ff88'
                          }
                        }}
                      >
                        {account.substring(0, 6)}...{account.substring(account.length - 4)}
                      </Button>
                    )}
                  </Box>
                  
                  <Box display="flex" alignItems="center">
                    <Button 
                      variant="contained" 
                      onClick={refreshData}
                      startIcon={<RefreshIcon />}
                      disabled={loading}
                      sx={{ 
                        mr: 2,
                        backgroundColor: '#00b4ff',
                        '&:hover': {
                          backgroundColor: '#0095ff'
                        }
                      }}
                    >
                      {loading ? 'Loading...' : 'Refresh Data'}
                    </Button>
                    
                    {loading && <CircularProgress size={24} sx={{ color: '#00ff88' }} />}
                    
                    {lastRefresh && (
                      <Typography variant="caption" color="textSecondary">
                        Last update: {lastRefresh.toLocaleTimeString()}
                      </Typography>
                    )}
                  </Box>
                </Box>
                
                {blockchainStatus.error && (
                  <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                    Error: {blockchainStatus.error}
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Stats Overview */}
            {sensorData.length > 0 && (
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <Card sx={{ 
                    backgroundColor: '#121212',
                    border: '1px solid rgba(0, 255, 136, 0.2)',
                    boxShadow: '0 0 15px rgba(0, 255, 136, 0.1)'
                  }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={1}>
                        <TrendingUpIcon sx={{ color: '#00ff88', mr: 1 }} />
                        <Typography variant="h6" color="#00ff88">
                          Temperature
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="baseline">
                        <Typography variant="h4" sx={{ fontWeight: 'bold', mr: 2 }}>
                          {sensorData[sensorData.length - 1].temperature.toFixed(1)}°C
                        </Typography>
                        <Chip 
                          label={`${tempChange >= 0 ? '+' : ''}${tempChange}%`}
                          color={tempChange >= 0 ? 'success' : 'error'}
                          size="small"
                          sx={{ 
                            backgroundColor: tempChange >= 0 ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 0, 0, 0.2)',
                            color: tempChange >= 0 ? '#00ff88' : '#ff6b6b'
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        Setpoint: {tempSetpoint.min}°C - {tempSetpoint.max}°C | 24h change
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card sx={{ 
                    backgroundColor: '#121212',
                    border: '1px solid rgba(0, 180, 255, 0.2)',
                    boxShadow: '0 0 15px rgba(0, 180, 255, 0.1)'
                  }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={1}>
                        <WaterDropIcon sx={{ color: '#00b4ff', mr: 1 }} />
                        <Typography variant="h6" color="#00b4ff">
                          Humidity
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="baseline">
                        <Typography variant="h4" sx={{ fontWeight: 'bold', mr: 2 }}>
                          {sensorData[sensorData.length - 1].humidity.toFixed(1)}%
                        </Typography>
                        <Chip 
                          label={`${humChange >= 0 ? '+' : ''}${humChange}%`}
                          color={humChange >= 0 ? 'success' : 'error'}
                          size="small"
                          sx={{ 
                            backgroundColor: humChange >= 0 ? 'rgba(0, 180, 255, 0.2)' : 'rgba(255, 0, 0, 0.2)',
                            color: humChange >= 0 ? '#00b4ff' : '#ff6b6b'
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        Setpoint: {humSetpoint.min}% - {humSetpoint.max}% | 24h change
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card sx={{ 
                    backgroundColor: '#121212',
                    border: '1px solid rgba(255, 107, 107, 0.2)',
                    boxShadow: '0 0 15px rgba(255, 107, 107, 0.1)'
                  }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={1}>
                        <DashboardIcon sx={{ color: '#ff6b6b', mr: 1 }} />
                        <Typography variant="h6" color="#ff6b6b">
                          Monitoring Duration
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="baseline">
                        <Typography variant="h4" sx={{ fontWeight: 'bold', mr: 2 }}>
                          {elapsedTime.days}d {elapsedTime.hours}h
                        </Typography>
                        <Chip 
                          label={`${elapsedTime.minutes}m ${elapsedTime.seconds}s`}
                          color="primary"
                          size="small"
                          sx={{ 
                            backgroundColor: 'rgba(255, 107, 107, 0.2)',
                            color: '#ff6b6b'
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        Started: {monitoringStartTime.toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Main Content */}
            <Card sx={{ 
              backgroundColor: '#121212',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              width: '100%'
            }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange} 
                  aria-label="basic tabs example"
                  sx={{
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#00ff88'
                    }
                  }}
                >
                  <Tab 
                    label="Dashboard" 
                    icon={<DashboardIcon />} 
                    iconPosition="start" 
                    sx={{ 
                      color: tabValue === 0 ? '#00ff88' : '#aaa',
                      '&.Mui-selected': {
                        color: '#00ff88'
                      }
                    }}
                  />
                  <Tab 
                    label="Sensor Data" 
                    icon={<TableChartIcon />} 
                    iconPosition="start" 
                    sx={{ 
                      color: tabValue === 1 ? '#00b4ff' : '#aaa',
                      '&.Mui-selected': {
                        color: '#00b4ff'
                      }
                    }}
                  />
                </Tabs>
              </Box>
              
              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                  {/* Temperature Chart */}
                  <Grid item xs={12} sx={{ width: '100%' }}>
                    <Card sx={{ 
                      backgroundColor: '#1a1a1a',
                      border: '1px solid rgba(0, 255, 136, 0.1)',
                      boxShadow: '0 0 10px rgba(0, 255, 136, 0.05)'
                    }}>
                      <CardContent sx={{ height: { xs: 350, sm: 450 }, width: '100%' }}>
                        <Box display="flex" alignItems="center" mb={2}>
                          <TrendingUpIcon sx={{ color: '#00ff88', mr: 1 }} />
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              color: '#00ff88',
                              fontWeight: 'bold'
                            }}
                          >
                            Temperature History
                          </Typography>
                          <Chip 
                            label={`Setpoint: ${tempSetpoint.min}°C - ${tempSetpoint.max}°C`}
                            size="small"
                            sx={{ 
                              ml: 2,
                              backgroundColor: 'rgba(0, 255, 136, 0.2)',
                              color: '#00ff88'
                            }}
                          />
                        </Box>
                        <Line
                          key={`temp-${sensorData.length}-${tempSetpoint.min}-${tempSetpoint.max}`}
                          data={temperatureData}
                          options={{
                            ...chartOptions,
                            responsive: true,
                            maintainAspectRatio: false,
                            layout: {
                              padding: {
                                bottom: 50
                              }
                            },
                            scales: {
                              x: {
                                ticks: {
                                  maxRotation: 45,
                                  minRotation: 45,
                                  padding: 15
                                }
                              }
                            }
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Humidity Chart */}
                  <Grid item xs={12} sx={{ width: '100%' }}>
                    <Card sx={{ 
                      backgroundColor: '#1a1a1a',
                      border: '1px solid rgba(0, 180, 255, 0.1)',
                      boxShadow: '0 0 10px rgba(0, 180, 255, 0.05)'
                    }}>
                      <CardContent sx={{ height: { xs: 350, sm: 450 }, width: '100%' }}>
                        <Box display="flex" alignItems="center" mb={2}>
                          <WaterDropIcon sx={{ color: '#00b4ff', mr: 1 }} />
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              color: '#00b4ff',
                              fontWeight: 'bold'
                            }}
                          >
                            Humidity History
                          </Typography>
                          <Chip 
                            label={`Setpoint: ${humSetpoint.min}% - ${humSetpoint.max}%`}
                            size="small"
                            sx={{ 
                              ml: 2,
                              backgroundColor: 'rgba(0, 180, 255, 0.2)',
                              color: '#00b4ff'
                            }}
                          />
                        </Box>
                        <Line
                          key={`hum-${sensorData.length}-${humSetpoint.min}-${humSetpoint.max}`}
                          data={humidityData}
                          options={{
                            ...chartOptions,
                            responsive: true,
                            maintainAspectRatio: false,
                            layout: {
                              padding: {
                                bottom: 50
                              }
                            },
                            scales: {
                              x: {
                                ticks: {
                                  maxRotation: 45,
                                  minRotation: 45,
                                  padding: 15
                                }
                              }
                            }
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Card sx={{ 
                  backgroundColor: '#1a1a1a',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <TableChartIcon sx={{ color: '#00b4ff', mr: 1 }} />
                      <Typography variant="h6" sx={{ color: '#00b4ff', fontWeight: 'bold' }}>
                        Sensor Readings History
                      </Typography>
                    </Box>
                    <TableContainer component={Paper} sx={{ 
                      maxHeight: '500px', 
                      backgroundColor: '#121212',
                      '& .MuiTableCell-root': {
                        borderColor: 'rgba(255,255,255,0.1)'
                      }
                    }}>
                      <Table stickyHeader aria-label="sensor data table">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ color: '#00ff88', fontWeight: 'bold' }}>ID</TableCell>
                            <TableCell sx={{ color: '#00ff88', fontWeight: 'bold' }}>Sensor ID</TableCell>
                            <TableCell sx={{ color: '#00ff88', fontWeight: 'bold' }}>Location</TableCell>
                            <TableCell sx={{ color: '#00ff88', fontWeight: 'bold' }}>Process Stage</TableCell>
                            <TableCell sx={{ color: '#00ff88', fontWeight: 'bold' }}>Timestamp</TableCell>
                            <TableCell sx={{ color: '#00ff88', fontWeight: 'bold' }}>Temperature (°C)</TableCell>
                            <TableCell sx={{ color: '#00ff88', fontWeight: 'bold' }}>Humidity (%)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sensorData.map((row) => (
                            <TableRow 
                              key={row.id} 
                              hover 
                              sx={{ 
                                '&:hover': { 
                                  backgroundColor: 'rgba(0, 255, 136, 0.03)' 
                                },
                                '&:nth-of-type(odd)': {
                                  backgroundColor: 'rgba(255, 255, 255, 0.02)'
                                }
                              }}
                            >
                              <TableCell>{row.id}</TableCell>
                              <TableCell>{row.sensorId}</TableCell>
                              <TableCell>{row.location}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={row.processStage} 
                                  color={
                                    row.processStage === 'Fermentation' ? 'primary' : 
                                    row.processStage === 'Drying' ? 'secondary' : 'default'
                                  } 
                                  size="small"
                                  sx={{
                                    fontWeight: 'bold',
                                    backgroundColor: 
                                      row.processStage === 'Fermentation' ? 'rgba(0, 255, 136, 0.2)' :
                                      row.processStage === 'Drying' ? 'rgba(0, 180, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                    color: 
                                      row.processStage === 'Fermentation' ? '#00ff88' :
                                      row.processStage === 'Drying' ? '#00b4ff' : '#fff'
                                  }}
                                />
                              </TableCell>
                              <TableCell>{row.timestamp.toLocaleString()}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={row.temperature.toFixed(1)} 
                                  sx={{
                                    fontWeight: 'bold',
                                    backgroundColor: 
                                      row.temperature > tempSetpoint.max ? 'rgba(255, 107, 107, 0.2)' :
                                      row.temperature < tempSetpoint.min ? 'rgba(255, 214, 0, 0.2)' : 'rgba(0, 255, 136, 0.2)',
                                    color: 
                                      row.temperature > tempSetpoint.max ? '#ff6b6b' :
                                      row.temperature < tempSetpoint.min ? '#ffd600' : '#00ff88',
                                    border: 'none'
                                  }}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={row.humidity.toFixed(1)} 
                                  sx={{
                                    fontWeight: 'bold',
                                    backgroundColor: 
                                      row.humidity > humSetpoint.max ? 'rgba(255, 107, 107, 0.2)' :
                                      row.humidity < humSetpoint.min ? 'rgba(255, 214, 0, 0.2)' : 'rgba(0, 180, 255, 0.2)',
                                    color: 
                                      row.humidity > humSetpoint.max ? '#ff6b6b' :
                                      row.humidity < humSetpoint.min ? '#ffd600' : '#00b4ff',
                                    border: 'none'
                                  }}
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </TabPanel>
            </Card>
          </Grid>
        </Grid>

        {/* Footer */}
        <Box sx={{ 
          mt: 4,
          textAlign: 'center',
          color: '#aaa',
          fontSize: '0.8rem'
        }}>
          <Typography variant="caption">
            KOPTEN CHAIN - Storage Tank Monitoring System | Powered by Ethereum Smart Contracts
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CoffeeIcon sx={{ fontSize: '1rem', mr: 1 }} />
            <Typography variant="caption">
              Real-time fermentation data on the blockchain
            </Typography>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;