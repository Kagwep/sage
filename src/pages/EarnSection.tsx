import { useState } from 'react';

// Define types for our earning opportunities
type EarningOption = {
  id: string;
  title: string;
  description: string;
  type: 'staking' | 'liquidity' | 'farming' | 'other';
  stats: {
    label: string;
    value: string;
  }[];
  link: string;
  buttonText: string;
};

// Sample data
const earningOptions: EarningOption[] = [
  {
    id: 'lsk-staking',
    title: 'LSK Staking',
    description: 'Earn 17.55% APR in rewards by staking LSK and gain voting power for governance',
    type: 'staking',
    stats: [
      { label: 'APR', value: '17.55%' },
    ],
    link: 'https://portal.lisk.com/staking/stake',
    buttonText: 'Stake LSK'
  }
];

export const EarnSection = () => {
  const handleCardClick = (option: EarningOption) => {
    window.open(option.link, '_blank');
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Earning Opportunities</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {earningOptions.map((option) => (
          <div
            key={option.id}
            className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleCardClick(option)}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold">{option.title}</h3>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                {option.type}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              {option.description}
            </p>

            <div className="bg-gray-50 p-3 rounded mb-4">
              {option.stats.map((stat, index) => (
                <div 
                  key={index} 
                  className="flex justify-between mb-1 last:mb-0"
                >
                  <span className="text-sm">{stat.label}</span>
                  <span className="text-sm font-semibold">{stat.value}</span>
                </div>
              ))}
            </div>

            <button 
              className="w-full bg-green-700 text-white py-2 rounded hover:bg-green-800 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick(option);
              }}
            >
              {option.buttonText}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};