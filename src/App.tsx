/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { LoginView } from './components/auth/LoginView';
import { SuperAdminLayout } from './components/superAdmin/SuperAdminLayout';
import { ShopAdminLayout } from './components/shopAdmin/ShopAdminLayout';
import { EmployeePortal } from './components/employee/EmployeePortal';
import { Store, Monitor, RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { role, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F1E7] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-[#68151F] animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-[#68151F]">Initializing LUMORA...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !role) {
    return <LoginView />;
  }

  // Shopkeeper Role has its dedicated full-screen architecture (Dark Sidebar + Top Bar + Dashboard Canvas)
  if (role === 'SHOP_ADMIN') {
    return <ShopAdminLayout />;
  }

  // Employee Portal (Shift Lead / Cashier) has its dedicated full-screen architecture matching the LUMORA design
  if (role === 'SHIFT_LEAD' || role === 'CASHIER') {
    return <EmployeePortal />;
  }

  return (
    <div className="min-h-screen bg-[#F7F1E7] text-[#171717] flex flex-col font-sans">
      <Header />

      <main className="flex-1 pb-12">
        {role === 'SUPER_ADMIN' && <SuperAdminLayout />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
