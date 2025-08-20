'use client';

import { FiBook } from 'react-icons/fi';

interface MiradorButtonProps {
  manifestUrl: string;
  className?: string;
  label?: string;
}

export default function MiradorButton({ manifestUrl, className = '', label = 'Miradorで表示' }: MiradorButtonProps) {
  const openInMirador = () => {
    const encodedUrl = encodeURIComponent(manifestUrl);
    const miradorUrl = `/mirador/index.html?manifest=${encodedUrl}`;
    window.open(miradorUrl, '_blank');
  };

  return (
    <button
      onClick={openInMirador}
      className={className || "flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"}
    >
      <FiBook />
      {label}
    </button>
  );
}