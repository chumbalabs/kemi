# Kemi Crypto Dashboard

A modern, responsive cryptocurrency dashboard built with React, TypeScript, Vite, and Tailwind CSS. The dashboard provides real-time data from CoinGecko API and AI-powered market analysis using OpenAI's GPT-4o.

## Features

- **Real-time Cryptocurrency Data**: View trending coins and top cryptocurrencies by market cap
- **AI-Powered Market Analysis**: Get insights and analysis about the crypto market using OpenAI's GPT-4o
- **Modern UI**: Built with Tailwind CSS for a responsive and clean design
- **Type Safety**: Written in TypeScript for enhanced developer experience and code quality

## Screenshots

(Add screenshots of your application here)

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/kemi-crypto.git
   cd kemi-crypto
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Environment Variables:
   
   The application loads environment variables from the parent directory's `.env` file. Make sure you have a `.env` file in the project root (parent directory) with the following variables:
   
   ```
   VITE_API_BASE_URL=http://localhost:8000
   VITE_COINGECKO_API_KEY=your_coingecko_api_key
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```
   
   Note: The application can run without API keys, but you may encounter rate limits with CoinGecko, and the AI analysis feature will not work without a Gemini API key.

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## API Keys

### CoinGecko API

The application uses the CoinGecko API to fetch cryptocurrency data. You can use the free tier, but it has rate limits. For better performance, consider getting an API key from [CoinGecko](https://www.coingecko.com/en/api).

### Gemini AI API

The AI market analysis feature requires a Google Gemini API key. You can get one from [Google AI Studio](https://ai.google.dev/).

## Building for Production

To build the application for production, run:

```bash
npm run build
# or
yarn build
```

The build output will be in the `dist` directory.

## Technologies Used

- **React**: Front-end library for building user interfaces
- **TypeScript**: Type-safe JavaScript
- **Vite**: Next-generation frontend tooling
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: Promise-based HTTP client
- **CoinGecko API**: Cryptocurrency data API
- **Google Gemini AI**: AI-powered market analysis

## License

This project is licensed under the MIT License - see the LICENSE file for details.
