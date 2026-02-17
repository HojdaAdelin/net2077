import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { 
  Users, UserPlus, MessageCircle, ChevronLeft, ChevronRight, Menu, Send, Check, XCircle, 
  User as UserIcon, ArrowLeft, Settings, X as XIcon, Plus, Trash2, MessageSquare,
  Terminal, Code, HelpCircle, BookOpen, Wrench, Shield, Database, Globe, Cpu, Server
} from 'lucide-react';
import { API_URL } from '../config';
import '../styles/Forum.css';

const AVAILABLE_ICONS = [
  { name: 'MessageSquare', label: '💬 Message' },
  { name: 'Terminal', label: '⌨️ Terminal' },
  { name: 'Code', label: '💻 Code' },
  { name: 'HelpCircle', label: '❓ Help' },
  { name: 'BookOpen', label: '📖 Book' },
  { name: 'Wrench', label: '🔧 Tools' },
  { name: 'Shield', label: '🛡️ Security' },
  { name: 'Database', label: '💾 Database' },
  { name: 'Globe', label: '🌐 Network' },
  { name: 'Cpu', label: '⚙️ Hardware' },
  { name: 'Server', label: '🖥️ Server' }
];

const getIconComponent = (iconName) => {
  const icons = {
    MessageSquare, Terminal, Code, HelpCircle, BookOpen, 
    Wrench, Shield, Database, Globe, Cpu, Server
  };
  return icons[iconName] || MessageSquare;
};

export default function Forum() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { zoneId, itemId, topicId } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageWaitTime, setMessageWaitTime] = useState(0);
  const [forumZones, setForumZones] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'zone' | 'item' | 'topic'
  const [modalData, setModalData] = useState({ name: '', icon: 'MessageSquare', order: 1, zoneId: null });
  const [currentItem, setCurrentItem] = useState(null);
  const [topics, setTopics] = useState([]);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [replies, setReplies] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [replyContent, setReplyContent] = useState('');
  const [editingTopic, setEditingTopic] = useState(false);
  const [loadingTopic, setLoadingTopic] = useState(false);
  const [loadingItem, setLoadingItem] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    if (user) {
      loadFriends();
      if (topicId) {
        setCurrentItem(null);
        setCurrentTopic(null);
        setTopics([]);
        setReplies([]);
        loadTopic();
      } else if (zoneId && itemId) {
        setCurrentTopic(null);
        setCurrentItem(null);
        setReplies([]);
        setTopics([]);
        loadItemTopics();
      } else {
        setCurrentTopic(null);
        setCurrentItem(null);
        setTopics([]);
        setReplies([]);
        loadForumStructure();
      }
    }
  }, [user, zoneId, itemId, topicId]);

  useEffect(() => {
    if (messageWaitTime > 0) {
      const timer = setTimeout(() => setMessageWaitTime(messageWaitTime - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [messageWaitTime]);

  const loadFriends = async () => {
    try {
      const response = await fetch(`${API_URL}/friends`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setFriends(data.friends || []);
        setFriendRequests(data.friendRequests || []);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadForumStructure = async () => {
    try {
      const response = await fetch(`${API_URL}/forum/structure`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setForumZones(data.zones || []);
      }
    } catch (error) {
      console.error('Error loading forum structure:', error);
    }
  };

  const loadItemTopics = async () => {
    setLoadingItem(true);
    try {
      const response = await fetch(`${API_URL}/forum/zones/${zoneId}/items/${itemId}/topics`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setCurrentItem(data.item);
        setTopics(data.topics || []);
      }
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoadingItem(false);
    }
  };

  const createTopic = async (title) => {
    try {
      const response = await fetch(`${API_URL}/forum/zones/${zoneId}/items/${itemId}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title })
      });
      if (response.ok) {
        loadItemTopics();
        setShowModal(false);
        setModalData({ name: '', icon: 'MessageSquare', order: 1, zoneId: null });
      }
    } catch (error) {
      console.error('Error creating topic:', error);
    }
  };

  const deleteTopic = async (topicId) => {
    try {
      const response = await fetch(`${API_URL}/forum/zones/${zoneId}/items/${itemId}/topics/${topicId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        loadItemTopics();
      }
    } catch (error) {
      console.error('Error deleting topic:', error);
    }
  };

  const loadTopic = async (page = 1) => {
    setLoadingTopic(true);
    try {
      const response = await fetch(`${API_URL}/forum/topics/${topicId}?page=${page}&limit=10`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setCurrentTopic(data.topic);
        setReplies(data.replies || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error loading topic:', error);
    } finally {
      setLoadingTopic(false);
    }
  };

  const updateTopicContent = async (content, minRoleToReply) => {
    try {
      const response = await fetch(`${API_URL}/forum/topics/${topicId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content, minRoleToReply })
      });
      if (response.ok) {
        loadTopic(pagination.currentPage);
        setEditingTopic(false);
      }
    } catch (error) {
      console.error('Error updating topic:', error);
    }
  };

  const createReply = async () => {
    if (!replyContent.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/forum/topics/${topicId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: replyContent })
      });
      const data = await response.json();
      if (response.ok) {
        setReplyContent('');
        loadTopic(pagination.currentPage);
      } else {
        alert(data.message || 'Error creating reply');
      }
    } catch (error) {
      console.error('Error creating reply:', error);
      alert('Error creating reply');
    }
  };

  const deleteReply = async (replyId) => {
    try {
      const response = await fetch(`${API_URL}/forum/topics/${topicId}/replies/${replyId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        loadTopic(pagination.currentPage);
      }
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
  };

  const canUserReply = () => {
    if (!currentTopic || !user) return false;
    
    const roleHierarchy = ['user', 'helper', 'mod', 'head-mod', 'admin', 'head-admin', 'root'];
    const userRoleIndex = roleHierarchy.indexOf(user.role || 'user');
    const minRoleIndex = roleHierarchy.indexOf(currentTopic.minRoleToReply || 'user');
    
    return userRoleIndex >= minRoleIndex;
  };

  const createZone = async (name, order) => {
    try {
      const response = await fetch(`${API_URL}/forum/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, order })
      });
      if (response.ok) {
        loadForumStructure();
        setShowModal(false);
        setModalData({ name: '', icon: 'MessageSquare', order: 1, zoneId: null });
      }
    } catch (error) {
      console.error('Error creating zone:', error);
    }
  };

  const addItem = async (zoneId, name, icon, order) => {
    try {
      const response = await fetch(`${API_URL}/forum/zones/${zoneId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, icon, order })
      });
      if (response.ok) {
        loadForumStructure();
        setShowModal(false);
        setModalData({ name: '', icon: 'MessageSquare', order: 1, zoneId: null });
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleModalSubmit = () => {
    if (!modalData.name.trim()) return;
    
    if (modalType === 'zone') {
      createZone(modalData.name, modalData.order);
    } else if (modalType === 'item') {
      addItem(modalData.zoneId, modalData.name, modalData.icon, modalData.order);
    } else if (modalType === 'topic') {
      createTopic(modalData.name);
    }
  };

  const openZoneModal = () => {
    setModalType('zone');
    setModalData({ name: '', icon: 'MessageSquare', order: forumZones.length + 1, zoneId: null });
    setShowModal(true);
  };

  const openItemModal = (zoneId, itemCount) => {
    setModalType('item');
    setModalData({ name: '', icon: 'MessageSquare', order: itemCount + 1, zoneId });
    setShowModal(true);
  };

  const openTopicModal = () => {
    setModalType('topic');
    setModalData({ name: '', icon: 'MessageSquare', order: 1, zoneId: null });
    setShowModal(true);
  };

  const updateZone = async (zoneId, name, order) => {
    try {
      const response = await fetch(`${API_URL}/forum/zones/${zoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, order })
      });
      if (response.ok) {
        loadForumStructure();
      }
    } catch (error) {
      console.error('Error updating zone:', error);
    }
  };

  const deleteZone = async (zoneId) => {
    try {
      const response = await fetch(`${API_URL}/forum/zones/${zoneId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        loadForumStructure();
      }
    } catch (error) {
      console.error('Error deleting zone:', error);
    }
  };

  const updateItem = async (zoneId, itemId, name, icon, order) => {
    try {
      const response = await fetch(`${API_URL}/forum/zones/${zoneId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, icon, order })
      });
      if (response.ok) {
        loadForumStructure();
      }
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const deleteItem = async (zoneId, itemId) => {
    try {
      const response = await fetch(`${API_URL}/forum/zones/${zoneId}/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        loadForumStructure();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const sendFriendRequest = async () => {
    if (!searchUsername.trim()) return;
    
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`${API_URL}/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: searchUsername })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage('Friend request sent!');
        setSearchUsername('');
      } else {
        setMessage(data.message || 'Error sending request');
      }
    } catch (error) {
      setMessage('Error sending request');
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/friends/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId })
      });
      
      if (response.ok) {
        loadFriends();
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const rejectRequest = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/friends/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId })
      });
      
      if (response.ok) {
        loadFriends();
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const openConversation = async (friend) => {
    setSelectedFriend(friend);
    try {
      const response = await fetch(`${API_URL}/friends/conversation/${friend._id}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setConversation(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedFriend || sendingMessage) return;
    
    setSendingMessage(true);
    
    try {
      const response = await fetch(`${API_URL}/friends/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          userId: selectedFriend._id, 
          message: messageText 
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setConversation([...conversation, {
          from: { _id: user.id, username: user.username },
          to: selectedFriend,
          message: messageText,
          createdAt: new Date()
        }]);
        setMessageText('');
        setMessageWaitTime(15);
      } else if (response.status === 429) {
        setMessageWaitTime(data.waitTime || 15);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  if (!user) {
    return (
      <div className="forum-page">
        <div className="forum-auth-notice">
          <Users size={64} />
          <h2>Login Required</h2>
          <p>Please login to access the Forum and connect with friends.</p>
          <Link to="/login" className="btn btn-primary">
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="forum-page">
      <div className={`forum-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        {sidebarOpen && (
          <div className="sidebar-content">
            <div className="sidebar-header">
              <h2>NET2077 Forum</h2>
              <button className="sidebar-toggle" onClick={() => setSidebarOpen(false)}>
                <ChevronLeft size={20} />
              </button>
            </div>

            <div className="sidebar-nav">
              <button 
                className={`sidebar-nav-btn ${activeView === 'friends' ? 'active' : ''}`}
                onClick={() => setActiveView('friends')}
              >
                <Users size={18} />
                Friends
              </button>
              {user.role && user.role !== 'user' ? (
                <Link 
                  to={`/profile/${user.username}`} 
                  className="sidebar-profile-link"
                  data-role={user.role}
                >
                  <div className="profile-link-left">
                    <UserIcon size={18} />
                    <span className="profile-username">{user.username}</span>
                  </div>
                  <span className="profile-role-badge">
                    {user.role.replace('-', ' ')}
                  </span>
                </Link>
              ) : (
                <Link to={`/profile/${user.username}`} className="sidebar-nav-btn">
                  <UserIcon size={18} />
                  Profile
                </Link>
              )}
            </div>

            {activeView === 'friends' && (
              <div className="friends-section">
                <div className="friend-request-form">
                  <input
                    type="text"
                    placeholder="Enter username"
                    value={searchUsername}
                    onChange={(e) => setSearchUsername(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendFriendRequest()}
                  />
                  <button onClick={sendFriendRequest} disabled={loading}>
                    <UserPlus size={18} />
                  </button>
                </div>
                
                {message && <div className="friend-message">{message}</div>}

                {friendRequests.length > 0 && (
                  <div className="friend-requests">
                    <h3>Friend Requests</h3>
                    {friendRequests.map((request) => (
                      <div key={request.from._id} className="friend-request-card">
                        <div className="friend-request-info">
                          <span className="friend-name">{request.from.username}</span>
                          <span className="friend-level">Lvl {request.from.level}</span>
                        </div>
                        <div className="friend-request-actions">
                          <button 
                            className="accept-btn"
                            onClick={() => acceptRequest(request.from._id)}
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            className="reject-btn"
                            onClick={() => rejectRequest(request.from._id)}
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="friends-list">
                  <h3>Friends ({friends.length})</h3>
                  {friends.length === 0 ? (
                    <div className="no-friends">No friends yet</div>
                  ) : (
                    friends.map((friend) => (
                      <div 
                        key={friend._id} 
                        className="friend-card"
                        onClick={() => openConversation(friend)}
                      >
                        <div className="friend-info">
                          <Link 
                            to={`/profile/${friend.username}`} 
                            className="friend-name-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {friend.username}
                          </Link>
                          <span className="friend-level">Lvl {friend.level}</span>
                        </div>
                        <MessageCircle size={16} className="message-icon" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="forum-main">
        {!sidebarOpen && (
          <button className="sidebar-open-btn" onClick={() => setSidebarOpen(true)}>
            <ChevronRight size={20} />
          </button>
        )}
        
        {user?.role === 'root' && !selectedFriend && !currentItem && (
          <button 
            className="edit-forum-btn"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? <XIcon size={18} /> : <Settings size={18} />}
            {editMode ? 'Close Edit' : 'Edit Forum'}
          </button>
        )}

        {(user?.role === 'root' || user?.role === 'head-admin') && currentItem && !selectedFriend && !currentTopic && (
          <button 
            className="edit-item-btn"
            onClick={openTopicModal}
          >
            <Plus size={18} />
            Add Topic
          </button>
        )}

        {(user?.role === 'root' || user?.role === 'head-admin') && currentTopic && !selectedFriend && (
          <button 
            className="edit-topic-btn"
            onClick={() => setEditingTopic(!editingTopic)}
          >
            {editingTopic ? <XIcon size={18} /> : <Settings size={18} />}
            {editingTopic ? 'Cancel Edit' : 'Edit Topic'}
          </button>
        )}
        
        {selectedFriend ? (
          <div className="conversation-view">
            <div className="conversation-header">
              <h2>{selectedFriend.username}</h2>
              <button onClick={() => setSelectedFriend(null)}>
                <ArrowLeft size={20} />
              </button>
            </div>
            
            <div className="messages-container">
              {conversation.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`message ${msg.from._id === user.id ? 'sent' : 'received'}`}
                >
                  <div className="message-author">{msg.from.username}</div>
                  <div className="message-text">{msg.message}</div>
                  <div className="message-time">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="message-input-container">
              <input
                type="text"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={messageWaitTime > 0}
              />
              <button 
                onClick={sendMessage} 
                disabled={sendingMessage || messageWaitTime > 0}
              >
                {messageWaitTime > 0 ? messageWaitTime : <Send size={18} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="forum-content">
            {loadingTopic ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading topic...</p>
              </div>
            ) : loadingItem ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading topics...</p>
              </div>
            ) : currentTopic ? (
              <div className="topic-view">
                <div className="topic-view-header">
                  <button 
                    className="back-btn" 
                    onClick={() => {
                      setCurrentTopic(null);
                      setReplies([]);
                      setReplyContent('');
                      navigate(`/forum/${currentTopic.zoneId}/${currentTopic.itemId}`);
                    }}
                  >
                    <ArrowLeft size={20} />
                    Back to Topics
                  </button>
                  <h2 className="topic-view-title">{currentTopic.title}</h2>
                </div>

                <div className="topic-main-content">
                  <div className="topic-author-card">
                    <Link to={`/profile/${currentTopic.author.username}`} className="author-link">
                      <div className="author-avatar">
                        {currentTopic.author.profilePicture ? (
                          <img src={currentTopic.author.profilePicture} alt={currentTopic.author.username} />
                        ) : (
                          <UserIcon size={32} />
                        )}
                      </div>
                      <div className="author-info">
                        <span className="author-username">{currentTopic.author.username}</span>
                        <span className="author-role" data-role={currentTopic.author.role}>
                          {currentTopic.author.role}
                        </span>
                        <span className="author-level">Level {currentTopic.author.level}</span>
                      </div>
                    </Link>
                  </div>

                  <div className="topic-content-area">
                    {editingTopic ? (
                      <div className="topic-edit-form">
                        <textarea
                          value={currentTopic.content}
                          onChange={(e) => setCurrentTopic({ ...currentTopic, content: e.target.value })}
                          placeholder="Topic content..."
                          rows="10"
                        />
                        <div className="topic-edit-controls">
                          <label>
                            Min Role to Reply:
                            <select
                              value={currentTopic.minRoleToReply}
                              onChange={(e) => setCurrentTopic({ ...currentTopic, minRoleToReply: e.target.value })}
                            >
                              <option value="user">User</option>
                              <option value="helper">Helper</option>
                              <option value="mod">Mod</option>
                              <option value="head-mod">Head Mod</option>
                              <option value="admin">Admin</option>
                              <option value="head-admin">Head Admin</option>
                              <option value="root">Root</option>
                            </select>
                          </label>
                          <div className="edit-buttons">
                            <button onClick={() => updateTopicContent(currentTopic.content, currentTopic.minRoleToReply)}>
                              Save
                            </button>
                            <button onClick={() => setEditingTopic(false)}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="topic-content-display">
                        {currentTopic.content || <em>No content yet</em>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="topic-replies-section">
                  <h3>Replies ({currentTopic.replyCount || 0})</h3>
                  
                  <div className="replies-list">
                    {replies.map((reply) => (
                      <div key={reply._id} className="reply-card">
                        <Link to={`/profile/${reply.author.username}`} className="reply-author">
                          <div className="reply-avatar">
                            {reply.author.profilePicture ? (
                              <img src={reply.author.profilePicture} alt={reply.author.username} />
                            ) : (
                              <UserIcon size={24} />
                            )}
                          </div>
                          <div className="reply-author-info">
                            <span className="reply-username">{reply.author.username}</span>
                            <span className="reply-role" data-role={reply.author.role}>
                              {reply.author.role}
                            </span>
                          </div>
                        </Link>
                        <div className="reply-content">{reply.content}</div>
                        <div className="reply-footer">
                          <span className="reply-date">
                            {new Date(reply.createdAt).toLocaleString()}
                          </span>
                          {(user?.role === 'root' || user?.role === 'head-admin') && (
                            <button 
                              className="delete-reply-btn"
                              onClick={() => deleteReply(reply._id)}
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {pagination.totalPages > 1 && (
                    <div className="pagination">
                      <button 
                        disabled={pagination.currentPage === 1}
                        onClick={() => loadTopic(pagination.currentPage - 1)}
                      >
                        Previous
                      </button>
                      <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
                      <button 
                        disabled={pagination.currentPage === pagination.totalPages}
                        onClick={() => loadTopic(pagination.currentPage + 1)}
                      >
                        Next
                      </button>
                    </div>
                  )}

                  {canUserReply() && (
                    <div className="reply-form">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write your reply..."
                        rows="4"
                      />
                      <button onClick={createReply} disabled={!replyContent.trim()}>
                        <Send size={18} />
                        Post Reply
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : currentItem ? (
              <div className="item-topics-view">
                <div className="item-header">
                  <button 
                    className="back-btn" 
                    onClick={() => {
                      setEditMode(false);
                      navigate('/forum');
                    }}
                  >
                    <ArrowLeft size={20} />
                    Back to Forum
                  </button>
                  <h2 className="item-title">
                    {(() => {
                      const IconComponent = getIconComponent(currentItem.icon);
                      return <IconComponent size={24} className="item-title-icon" />;
                    })()}
                    {currentItem.name}
                  </h2>
                </div>

                <div className="topics-list">
                  {topics.length === 0 ? (
                    <div className="no-topics">
                      <MessageSquare size={48} />
                      <p>No topics yet</p>
                    </div>
                  ) : (
                    topics.map((topic) => (
                      <div 
                        key={topic._id} 
                        className="topic-card"
                        onClick={() => navigate(`/forum/topic/${topic._id}`)}
                      >
                        <div className="topic-left">
                          <h3 className="topic-title">{topic.title}</h3>
                          <div className="topic-meta">
                            <span className="topic-author">by {topic.author.username}</span>
                            <span className="topic-date">
                              {new Date(topic.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="topic-stats">
                          <span className="reply-count">{topic.replyCount || 0}</span>
                          <span className="reply-label">replies</span>
                        </div>
                        {(user?.role === 'root' || user?.role === 'head-admin') && (
                          <button 
                            className="delete-topic-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTopic(topic._id);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : editMode && user?.role === 'root' ? (
              <div className="forum-edit-mode">
                <h2>Edit Forum Structure</h2>
                
                <button 
                  className="add-zone-btn"
                  onClick={openZoneModal}
                >
                  <Plus size={18} />
                  Add New Zone
                </button>

                {forumZones.map((zone) => (
                  <div key={zone._id} className="edit-zone">
                    <div className="edit-zone-header">
                      <input
                        type="number"
                        value={zone.order}
                        onChange={(e) => updateZone(zone._id, zone.name, parseInt(e.target.value))}
                        className="order-input"
                      />
                      <input
                        type="text"
                        value={zone.name}
                        onChange={(e) => updateZone(zone._id, e.target.value, zone.order)}
                        className="name-input"
                      />
                      <button onClick={() => deleteZone(zone._id)} className="delete-btn">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="edit-items">
                      {zone.items?.map((item) => (
                        <div key={item._id} className="edit-item">
                          <input
                            type="number"
                            value={item.order}
                            onChange={(e) => updateItem(zone._id, item._id, item.name, item.icon, parseInt(e.target.value))}
                            className="order-input-small"
                          />
                          <select
                            value={item.icon}
                            onChange={(e) => updateItem(zone._id, item._id, item.name, e.target.value, item.order)}
                            className="icon-select"
                          >
                            {AVAILABLE_ICONS.map(icon => (
                              <option key={icon.name} value={icon.name}>{icon.label}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(zone._id, item._id, e.target.value, item.icon, item.order)}
                            className="name-input-small"
                          />
                          <button onClick={() => deleteItem(zone._id, item._id)} className="delete-btn-small">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        className="add-item-btn"
                        onClick={() => openItemModal(zone._id, zone.items?.length || 0)}
                      >
                        <Plus size={14} />
                        Add Item
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="forum-zones">
                {forumZones.map((zone, zoneIdx) => (
                  <div key={zone._id} className="forum-zone">
                    <h3 className="zone-title">{zone.name}</h3>
                    <div className="zone-items">
                      {zone.items?.map((item) => {
                        const IconComponent = getIconComponent(item.icon);
                        return (
                          <div 
                            key={item._id} 
                            className="zone-item"
                            onClick={() => navigate(`/forum/${zone._id}/${item._id}`)}
                          >
                            <div className="zone-item-left">
                              <IconComponent size={20} className="item-icon" />
                              <span className="item-name">{item.name}</span>
                            </div>
                            <div className="zone-item-stats">
                              <span className="post-count">{item.postCount || 0}</span>
                              <span className="post-label">posts</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {zoneIdx < forumZones.length - 1 && <div className="zone-separator" />}
                  </div>
                ))}
                
                {forumZones.length === 0 && (
                  <div className="forum-empty">
                    <MessageSquare size={64} />
                    <h2>Forum</h2>
                    <p>No zones configured yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalType === 'zone' && 'Add New Zone'}
                {modalType === 'item' && 'Add New Item'}
                {modalType === 'topic' && 'Add New Topic'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <XIcon size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="modal-field">
                <label>{modalType === 'topic' ? 'Title' : 'Name'}</label>
                <input
                  type="text"
                  value={modalData.name}
                  onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                  placeholder={
                    modalType === 'zone' ? 'Zone name' : 
                    modalType === 'item' ? 'Item name' : 
                    'Topic title'
                  }
                  autoFocus
                />
              </div>

              {modalType === 'item' && (
                <div className="modal-field">
                  <label>Icon</label>
                  <select
                    value={modalData.icon}
                    onChange={(e) => setModalData({ ...modalData, icon: e.target.value })}
                  >
                    {AVAILABLE_ICONS.map(icon => (
                      <option key={icon.name} value={icon.name}>{icon.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {modalType !== 'topic' && (
                <div className="modal-field">
                  <label>Order</label>
                  <input
                    type="number"
                    value={modalData.order}
                    onChange={(e) => setModalData({ ...modalData, order: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="modal-btn-cancel" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="modal-btn-submit" onClick={handleModalSubmit}>
                {modalType === 'zone' && 'Create Zone'}
                {modalType === 'item' && 'Add Item'}
                {modalType === 'topic' && 'Create Topic'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
