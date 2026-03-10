import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomTabBar from '../components/BottomTabBar/BottomTabBar';
import AnnouncementsModal from '../components/Announcements/AnnouncementsModal';

const ProtectedLayout = () => {
  return (
    <div className="min-h-screen bg-white text-[#131e29] pb-20">
      <AnnouncementsModal />
      <Outlet />
      <BottomTabBar />
    </div>
  );
};

export default ProtectedLayout;
