import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-civic-bg-warm flex flex-col justify-center items-center text-civic-navy p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-civic-border p-6 text-center">
        <h1 className="text-2xl font-bold text-civic-navy mb-2">CivicPulse</h1>
        <p className="text-sm text-slate-600">AI-Powered Civic Issue Reporting and Resolution Platform</p>
      </div>
    </div>
  );
};

export default App;
