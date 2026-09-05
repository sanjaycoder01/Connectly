import React, { useState } from 'react';
import { NavigationRail } from './NavigationRail';
import { TopHeader } from './TopHeader';
import { ConversationsSidebar } from '../conversations/ConversationsSidebar';
import { EmptyChatState } from '../chat/EmptyChatState';
import { ActiveChatRoom } from '../chat/ActiveChatRoom';
import { WorkspaceHealthSidebar } from '../workspace/WorkspaceHealthSidebar';
import { NewChatModal } from '../conversations/NewChatModal';
import { useChat } from '../../context/ChatContext';

export const MainWorkspace: React.FC = () => {
  const [activeNavRailTab, setActiveNavRailTab] = useState('messages');
  const [activeTopTab, setActiveTopTab] = useState('all');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  const { activeConversation, startConversationWithUser } = useChat();

  const handleStartNewChat = () => {
    setIsNewChatModalOpen(true);
  };

  return (
    <div className="h-screen w-screen flex flex-row overflow-hidden bg-[#f4f6fb]">
      {/* 1. Leftmost Navigation Rail */}
      <NavigationRail
        activeTab={activeNavRailTab}
        onTabChange={setActiveNavRailTab}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <TopHeader
          activeNavTab={activeTopTab}
          onNavTabChange={setActiveTopTab}
        />

        {/* Workspace Body: 3-column split view */}
        <div className="flex-1 flex flex-row overflow-hidden">
          {/* Left Column: Conversations & Search */}
          <ConversationsSidebar
            onStartNewChat={handleStartNewChat}
            activeFilterTab={activeTopTab}
          />

          {/* Center Column: Active Chat or Empty Chat State */}
          {activeConversation ? (
            <ActiveChatRoom />
          ) : (
            <EmptyChatState
              onStartDirectMessage={handleStartNewChat}
              onSearchHistory={() => console.log('Search history')}
              onBrowseChannels={() => console.log('Browse channels')}
            />
          )}

          {/* Right Column: Workspace Health & Shortcuts */}
          <WorkspaceHealthSidebar />
        </div>
      </div>

      {/* New Direct Message Modal */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onSelectUser={async (u) => {
          await startConversationWithUser(u.id);
        }}
      />
    </div>
  );
};
