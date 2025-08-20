'use client';

import { useState } from 'react';
import { FiLock, FiGlobe, FiUsers, FiX } from 'react-icons/fi';

interface ImageAccessSettings {
  isPublic: boolean;
  allowedUsers: string[];
}

interface ImageAccessControlProps {
  images: Array<{
    url: string;
    width: number;
    height: number;
    access?: ImageAccessSettings;
  }>;
  onChange: (index: number, access: ImageAccessSettings) => void;
}

export default function ImageAccessControl({ images, onChange }: ImageAccessControlProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [newEmail, setNewEmail] = useState('');

  const handleAccessChange = (index: number, isPublic: boolean) => {
    const currentAccess = images[index].access || { isPublic: true, allowedUsers: [] };
    onChange(index, {
      ...currentAccess,
      isPublic
    });
  };

  const addAllowedUser = (index: number, email: string) => {
    if (!email || !email.includes('@')) return;
    
    const currentAccess = images[index].access || { isPublic: true, allowedUsers: [] };
    if (!currentAccess.allowedUsers.includes(email)) {
      onChange(index, {
        ...currentAccess,
        allowedUsers: [...currentAccess.allowedUsers, email]
      });
    }
    setNewEmail('');
  };

  const removeAllowedUser = (index: number, email: string) => {
    const currentAccess = images[index].access || { isPublic: true, allowedUsers: [] };
    onChange(index, {
      ...currentAccess,
      allowedUsers: currentAccess.allowedUsers.filter(u => u !== email)
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">画像ごとのアクセス設定</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((image, index) => {
          const access = image.access || { isPublic: true, allowedUsers: [] };
          
          return (
            <div 
              key={index} 
              className="border rounded-lg p-3 space-y-2"
            >
              <div className="aspect-square relative bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                <img 
                  src={image.url} 
                  alt={`画像 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  {access.isPublic ? (
                    <div className="bg-green-500 text-white p-1 rounded" title="公開">
                      <FiGlobe className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="bg-red-500 text-white p-1 rounded" title="非公開">
                      <FiLock className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">画像 {index + 1}</div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccessChange(index, true)}
                    className={`flex-1 px-2 py-1 text-xs rounded ${
                      access.isPublic 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <FiGlobe className="inline mr-1" />
                    公開
                  </button>
                  <button
                    onClick={() => handleAccessChange(index, false)}
                    className={`flex-1 px-2 py-1 text-xs rounded ${
                      !access.isPublic 
                        ? 'bg-red-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <FiLock className="inline mr-1" />
                    非公開
                  </button>
                </div>
                
                {!access.isPublic && (
                  <button
                    onClick={() => setSelectedImage(selectedImage === index ? null : index)}
                    className="w-full px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded"
                  >
                    <FiUsers className="inline mr-1" />
                    許可ユーザー ({access.allowedUsers.length})
                  </button>
                )}
                
                {selectedImage === index && !access.isPublic && (
                  <div className="space-y-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <div className="flex gap-1">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addAllowedUser(index, newEmail);
                          }
                        }}
                        placeholder="メールアドレス"
                        className="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-800"
                      />
                      <button
                        onClick={() => addAllowedUser(index, newEmail)}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded"
                      >
                        追加
                      </button>
                    </div>
                    
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {access.allowedUsers.map(email => (
                        <div key={email} className="flex items-center gap-1 text-xs">
                          <span className="flex-1 truncate">{email}</span>
                          <button
                            onClick={() => removeAllowedUser(index, email)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FiX />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}