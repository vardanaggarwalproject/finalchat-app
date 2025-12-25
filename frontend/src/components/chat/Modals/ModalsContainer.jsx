import React, { useState } from 'react';
import { useChat } from '../../../context/ChatContext';
import AddNewConversationModal from '@/components/AddNewConversationModal';
import AddGroupMembersModal from '@/components/AddGroupMembersModal';
// We'll create these three below
import CreateGroupModal from './CreateGroupModal';
import EditProfileModal from './EditProfileModal';
import GroupMembersModal from './GroupMembersModal';

const ModalsContainer = () => {
  const {
    showAddConversationModal, setShowAddConversationModal,
    showCreateGroup, setShowCreateGroup,
    showEditProfile, setShowEditProfile,
    showGroupMembersModal, setShowGroupMembersModal,
    selectedGroup,
    allUsers, users, loadingUsers,
    handleSelectNewUser
  } = useChat();

  const handleUserSelect = (user) => {
    handleSelectNewUser(user);
    setShowAddConversationModal(false);
  };

  return (
    <>
      <AddNewConversationModal
        isOpen={showAddConversationModal}
        onOpenChange={setShowAddConversationModal}
        allUsers={allUsers}
        chatUsers={users}
        onUserSelect={handleUserSelect}
        isLoading={loadingUsers}
      />

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />

      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
      />

      {showGroupMembersModal && (
        <GroupMembersModal
          isOpen={showGroupMembersModal}
          onClose={() => setShowGroupMembersModal(false)}
          group={selectedGroup}
        />
      )}
    </>
  );
};

export default ModalsContainer;
