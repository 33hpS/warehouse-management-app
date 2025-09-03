import React from 'react';

interface DemoModeBannerProps {
  isDemo: boolean;
}

const DemoModeBanner: React.FC<DemoModeBannerProps> = ({ isDemo }) => {
  if (!isDemo) return null;
  return (
    <div className="bg-blue-100 text-blue-800 py-2 px-4 text-center font-semibold shadow">
      Демо режим: некоторые функции могут быть ограничены
    </div>
  );
};

export default DemoModeBanner;
