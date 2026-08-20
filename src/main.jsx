import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import ReportGenerator from './ReportGenerator.jsx';
import './index.css';

const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  'pk_test_aHVtYW5lLWJsb3dmaXNoLTMxODMuY2xlcmsuYWNjb3VudHMuZGV2JA';

const CONVEX_URL =
  import.meta.env.VITE_CONVEX_URL ||
  'https://polished-alpaca-24.convex.cloud';

const convex = new ConvexReactClient(CONVEX_URL);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl shadow-md max-w-md w-full text-center">
            <h2 className="text-lg font-bold text-red-600 mb-2">সাময়িক সমস্যা হয়েছে</h2>
            <p className="text-xs text-slate-600 mb-4">
              {this.state.error?.message || 'অনুগ্রহ করে পেজটি রিফ্রেশ করুন'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-green-700 text-white text-xs px-4 py-2 rounded-lg font-semibold"
            >
              পেজ রিফ্রেশ করুন
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <ConvexProvider client={convex}>
          <ReportGenerator />
        </ConvexProvider>
      </ClerkProvider>
    </ErrorBoundary>
  </React.StrictMode>
);