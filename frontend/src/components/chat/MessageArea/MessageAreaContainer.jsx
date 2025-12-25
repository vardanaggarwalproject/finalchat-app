import React from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const MessageAreaContainer = () => {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white h-full overflow-hidden">
      <ChatHeader />
      <MessageList />
      <MessageInput />
    </div>
  );
};

export default MessageAreaContainer;
