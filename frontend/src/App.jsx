// App.jsx
import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Login from './pages/Login.jsx'
import SignUp from './pages/SignUp.jsx'
import AuthCallback from './pages/AuthCallback.jsx'
import Home from './pages/Home.jsx'
import ChatPage from './pages/ChatPage.jsx'
import GroupList from './components/GroupList.jsx'

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login/>} />
      <Route path="/signup" element={<SignUp/>} />
      <Route path="/auth/callback" element={<AuthCallback/>} />
      <Route path="/" element={<GroupList/>} />
      <Route path="/home" element={<Home/>} />
      <Route path="/chat/:roomId" element={<ChatPage/>} />
    </Routes>
  )
}

export default App