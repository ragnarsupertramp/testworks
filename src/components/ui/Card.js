import React from 'react';

export const Card = ({ children }) => (
  <div className="bg-white shadow-md rounded-lg p-6">
    {children}
  </div>
);

export const CardHeader = ({ children }) => (
  <div className="mb-4">
    {children}
  </div>
);

export const CardContent = ({ children }) => (
  <div>
    {children}
  </div>
);