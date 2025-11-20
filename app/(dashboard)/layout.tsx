// File: app/(dashboard)/layout.tsx
// Layout ini sekarang hanya sebagai pembungkus, tanpa UI.

import React from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    // Layout ini sengaja dibuat sederhana untuk membungkus
    // halaman pemilihan modul dan halaman modul internal.
    return (
        <>
            {children}
        </>
    );
}
