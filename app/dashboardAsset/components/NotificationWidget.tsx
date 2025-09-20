"use client";
import React from 'react';

// Tipe data diupdate untuk menyertakan objek 'location'
type AssetWithDetails = {
    id: string;
    productName: string;
    location: {
        name: string;
    };
    notification: { type: 'warning' | 'error', message: string } | null;
};

type NotificationWidgetProps = {
    assets: AssetWithDetails[];
};

const WarningIcon = () => (
    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);
const ErrorIcon = () => (
    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
);

export default function NotificationWidget({ assets }: NotificationWidgetProps) {
    const notifications = assets.filter(asset => asset.notification);

    if (notifications.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Notifikasi</h3>
                <p className="text-sm text-gray-500 text-center py-4">👍 Semua aset dalam kondisi prima. Tidak ada notifikasi.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-bold text-gray-800">Aset Perlu Perhatian</h3>
                <div className="flex items-center justify-center bg-red-500 text-white font-bold text-xs rounded-full w-5 h-5">
                    {notifications.length}
                </div>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                {notifications.map(asset => (
                    <div key={asset.id} className={`flex items-start gap-3 p-3 rounded-md ${asset.notification?.type === 'error' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                        <div>
                            {asset.notification?.type === 'error' ? <ErrorIcon /> : <WarningIcon />}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">{asset.productName}</p>
                            {/* --- PERUBAHAN DI SINI --- */}
                            <p className="text-xs font-medium text-gray-500">{asset.location.name}</p>
                            <p className="text-sm text-gray-600 mt-1">{asset.notification?.message}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

