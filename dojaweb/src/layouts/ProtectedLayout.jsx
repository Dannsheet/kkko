import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomTabBar from '../components/BottomTabBar/BottomTabBar';
import AnnouncementsModal from '../components/Announcements/AnnouncementsModal';

const ProtectedLayout = () => {
  return (
    <div className="flex flex-col h-screen">
      <AnnouncementsModal />
      <div
        className="flex-1 min-h-0 overflow-y-auto"
        data-scroll-container="main"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <Outlet />
      </div>
      <BottomTabBar />
    </div>
  );
};

export default ProtectedLayout;
