import React, { useState, useEffect } from 'react';
import { WagmiConfig, createClient, configureChains, useAccount, useConnect } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { ConnectButton, RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { ethers } from 'ethers';
import { contractAddress, contractABI } from './constants';
import './App.css';

// zkSync Testnet Chain Configuration
const zkSyncTestnet = {
  id: 11124,
  name: 'Abstract Testnet',
  network: 'abstract_testnet',
  nativeCurrency: {
    name: 'Abstract Testnet ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: 'https://api.testnet.abs.xyz',
  },
  blockExplorers: {
    default: { name: 'Abstract Explorer', url: 'https://explorer.testnet.abs.xyz' },
  },
  testnet: true,
};

const { chains, provider } = configureChains(
  [zkSyncTestnet],
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: 'Token Prediction Game',
  chains,
});

const wagmiClient = createClient({
  autoConnect: true, // Enable autoConnect
  connectors,
  provider,
});

function App() {
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains}>
        <div className="App d-flex flex-column min-vh-100">
          <Header />
          <MainContent />
          <Footer />
        </div>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

const Header = () => (
  <header className="bg-dark text-white p-3 d-flex justify-content-between align-items-center">
    <div className="d-flex align-items-center">
      <img src="logo.png" alt="Logo" height="70" className="me-3" />
      <h1 className="header-title"> X </h1>
      <img src="logo2.png" alt="Partner Logo" height="40" className="me-3" />
      <div className="d-flex align-items-center links">
        <a href="https://x.com/DynaSwap" className="text-white me-3">Twitter</a>
        <a href="https://discord.gg/kMKu47SN2j" className="text-white me-3">Discord</a>
      </div>
    </div>
    <ConnectButton />
  </header>
);

const MainContent = () => {
  const [ethPrice, setEthPrice] = useState(0);
  const [penguPrice, setPenguPrice] = useState(0);
  const [totalGamesPlayed, setTotalGamesPlayed] = useState(0);
  const [uniquePlayersCount, setUniquePlayersCount] = useState(0);
  const [totalPredictionsMade, setTotalPredictionsMade] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const { address, isConnected } = useAccount();

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,pudgy-penguins&vs_currencies=usd');
        const data = await response.json();
        setEthPrice(data.ethereum?.usd?.toFixed(0) || 0);
        setPenguPrice(data['pudgy-penguins']?.usd?.toFixed(5) || 0);
      } catch (error) {
        console.error('Error fetching prices:', error);
      }
    };

    const fetchStats = async () => {
      try {
        const provider = new ethers.providers.JsonRpcProvider('https://api.testnet.abs.xyz');
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        const totalGamesPlayed = await contract.totalGamesPlayed();
        const uniquePlayersCount = await contract.uniquePlayersCount();
        const totalPredictionsMade = await contract.totalPredictionsMade();
        setTotalGamesPlayed(totalGamesPlayed?.toNumber() || 0);
        setUniquePlayersCount(uniquePlayersCount?.toNumber() || 0);
        setTotalPredictionsMade(totalPredictionsMade?.toNumber() || 0);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    const fetchLeaderboard = async () => {
      try {
        const provider = new ethers.providers.JsonRpcProvider('https://api.testnet.abs.xyz');
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        const seasonNumber = await contract.seasonNumber();
        const predictions = await contract.getSeasonPredictions(seasonNumber.toNumber());
        const leaderboard = [];

        for (const prediction of predictions) {
          const player = prediction.player;
          const totalPoints = await contract.getTotalPoints(player);
          leaderboard.push({ player, totalPoints: totalPoints.toNumber() });
        }

        setLeaderboard(leaderboard);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
    };

    fetchPrices();
    fetchStats();
    fetchLeaderboard();
  }, []);

  return (
    <main className="container my-5 flex-grow-1">
      <Statistics totalGamesPlayed={totalGamesPlayed} uniquePlayersCount={uniquePlayersCount} totalPredictionsMade={totalPredictionsMade} />
      <div className="row">
        <div className="col-md-9">
          <PredictionForm ethPrice={ethPrice} penguPrice={penguPrice} walletConnected={isConnected} />
        </div>
        <div className="col-md-3">
          <Leaderboard leaderboard={leaderboard} />
        </div>
      </div>
    </main>
  );
};

const Statistics = ({ totalGamesPlayed, uniquePlayersCount, totalPredictionsMade }) => (
  <div className="mb-5">
    <h2 className="section-title">Game Statistics</h2>
    <div className="d-flex justify-content-between stats">
      <div>Total Games Played: {totalGamesPlayed}</div>
      <div>Total Unique Players: {uniquePlayersCount}</div>
      <div>Total Predictions Made: {totalPredictionsMade}</div>
    </div>
  </div>
);

const Leaderboard = ({ leaderboard }) => (
  <div className="mb-5">
    <h2 className="section-title">Leaderboard</h2>
    <ul className="list-group">
      {leaderboard.map((player, index) => (
        <li key={index} className="list-group-item">
          <div className="leaderboard-address">
            {`${player.player.slice(0, 6)}...${player.player.slice(-4)}`}
          </div>
          <div className="leaderboard-link">
            <a href={`https://explorer.testnet.abs.xyz/address/${player.player}`} target="_blank" rel="noopener noreferrer">
              View on Abstract Explorer
            </a>
          </div>
          <div><strong>Total Points:</strong> {player.totalPoints}</div>
        </li>
      ))}
    </ul>
  </div>
);

const PredictionForm = ({ ethPrice, penguPrice, walletConnected }) => {
  const [ethPrediction, setEthPrediction] = useState('');
  const [penguPrediction, setPenguPrediction] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!walletConnected) {
      alert('Please connect your wallet to submit a prediction.');
      return;
    }

    if (!/^\d+$/.test(ethPrediction)) {
      setError('Please enter a valid integer value for ETH.');
      return;
    }

    if (!/^\d{1,4}$/.test(penguPrediction)) {
      setError('Please enter a valid value for PENGU (e.g., 3866 for $0.03866).');
      return;
    }

    setError('');
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, contractABI, signer);

        // Call the makePrediction function from the contract
        const tx = await contract.makePrediction(ethPrediction, penguPrediction);
        await tx.wait();
        
        alert('Prediction submitted successfully.');
      } else {
        setError('Ethereum object not found, please install MetaMask.');
      }
    } catch (err) {
      console.error(err);
      setError('Transaction failed. Please try again.');
    }
  };

  return (
    <div className="mb-5">
      <h2 className="section-title">Token Predictions</h2>
      <form onSubmit={handleSubmit}>
        <div className="d-flex align-items-center prediction-form mb-3">
          <img src="ETH.png" alt="ETH Logo" height="40" className="me-3" />
          <div className="me-3">Current ETH Price: ${ethPrice}</div>
          <input
            type="number"
            value={ethPrediction}
            onChange={(e) => setEthPrediction(e.target.value)}
            placeholder="Predict ETH Price"
            className="form-control me-3"
          />
        </div>
        <div className="d-flex align-items-center prediction-form mb-3">
          <img src="PENGU.png" alt="PENGU Logo" height="40" className="me-3" />
          <div className="me-3">Current PENGU Price: ${penguPrice}</div>
          <input
            type="number"
            value={penguPrediction}
            onChange={(e) => setPenguPrediction(e.target.value)}
            placeholder="Predict PENGU Price"
            className="form-control me-3"
          />
        </div>
        <button type="submit" className="btn btn-primary">Submit</button>
      </form>
      {error && <div className="alert alert-danger mt-2">{error}</div>}
    </div>
  );
};

const Footer = () => (
  <footer className="bg-dark text-white p-3 text-center mt-auto">
    &copy; 2024 Token Prediction Game. All rights reserved.
  </footer>
);

export default App;