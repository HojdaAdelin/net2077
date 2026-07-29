import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { Zap, Sparkles, RotateCcw, ShoppingBag, Coins, ChevronLeft, ChevronRight, Send, X } from 'lucide-react';
import LoginRequired from '../components/LoginRequired';
import '../styles/Shop.css';

const iconMap = {
  Zap: Zap,
  Sparkles: Sparkles,
  RotateCcw: RotateCcw
};

export default function Shop() {
  const { user, updateUser } = useContext(AuthContext);
  const [specialOffers, setSpecialOffers] = useState([]);
  const [regularItems, setRegularItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const [dialog, setDialog] = useState({ show: false, type: '', title: '', message: '' });
  const [transferModal, setTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({ recipient: '', amount: '' });
  const [transferPreview, setTransferPreview] = useState(null);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferMsg, setTransferMsg] = useState({ text: '', ok: false });

  useEffect(() => {
    fetchShopItems();
  }, []);

  useEffect(() => {
    if (specialOffers.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % specialOffers.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [specialOffers.length]);

  const fetchShopItems = async () => {
    try {
      const response = await fetch(`${API_URL}/shop/items`);
      const data = await response.json();
      
      if (data.success) {
        setSpecialOffers(data.specialOffers);
        setRegularItems(data.regularItems);
      }
    } catch (error) {
      console.error('Error fetching shop items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (itemId) => {
    if (purchasing) return; // Prevent spam
    
    try {
      setPurchasing(true);
      
      const response = await fetch(`${API_URL}/shop/purchase/${itemId}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        updateUser({ 
          gold: data.remainingGold,
          inventory: data.inventory 
        });
        setDialog({
          show: true,
          type: 'success',
          title: 'Purchase Successful!',
          message: data.message
        });
      } else {
        setDialog({
          show: true,
          type: 'error',
          title: 'Purchase Failed',
          message: data.message
        });
      }
    } catch (error) {
      console.error('Error purchasing item:', error);
      setDialog({
        show: true,
        type: 'error',
        title: 'Purchase Failed',
        message: 'Failed to purchase item. Please try again.'
      });
    } finally {
      // Add delay to prevent spam
      setTimeout(() => {
        setPurchasing(false);
      }, 1500);
    }
  };

  const closeDialog = () => {
    setDialog({ show: false, type: '', title: '', message: '' });
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % specialOffers.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + specialOffers.length) % specialOffers.length);
  };

  // Gold transfer
  const handleAmountChange = (val) => {
    // Only allow positive integers
    const clean = val.replace(/[^0-9]/g, '');
    setTransferForm(f => ({ ...f, amount: clean }));
    setTransferMsg({ text: '', ok: false });
    const num = parseInt(clean, 10);
    if (clean && num > 0) {
      const commission = Math.floor(num * 0.1);
      const received = num - commission;
      setTransferPreview({ sent: num, commission, received });
    } else {
      setTransferPreview(null);
    }
  };

  const handleTransfer = async () => {
    const amount = parseInt(transferForm.amount, 10);
    if (!transferForm.recipient.trim()) { setTransferMsg({ text: 'Enter a username.', ok: false }); return; }
    if (!amount || amount <= 0) { setTransferMsg({ text: 'Enter a valid amount.', ok: false }); return; }
    if (amount > (user.gold || 0)) { setTransferMsg({ text: `Insufficient gold. You have ${user.gold || 0}.`, ok: false }); return; }

    setTransferLoading(true); setTransferMsg({ text: '', ok: false });
    try {
      const res = await fetch(`${API_URL}/shop/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recipientUsername: transferForm.recipient.trim(), amount })
      });
      const data = await res.json();
      if (res.ok) {
        updateUser({ gold: data.remainingGold });
        setTransferMsg({ text: `Sent! ${data.received} gold received by ${transferForm.recipient}.`, ok: true });
        setTransferForm({ recipient: '', amount: '' });
        setTransferPreview(null);
      } else {
        setTransferMsg({ text: data.message || 'Transfer failed.', ok: false });
      }
    } catch {
      setTransferMsg({ text: 'Network error.', ok: false });
    } finally {
      setTransferLoading(false);
    }
  };

  const closeTransferModal = () => {
    setTransferModal(false);
    setTransferForm({ recipient: '', amount: '' });
    setTransferPreview(null);
    setTransferMsg({ text: '', ok: false });
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  if (!user) {
    return (
      <LoginRequired 
        icon={ShoppingBag}
        title="Shop Access Required"
        description="Please login to access the shop and purchase items with your earned gold."
      />
    );
  }

  if (loading) {
    return (
      <div className="container shop-page">
        <div className="shop-loading">
          <div className="loading-spinner"></div>
          <p>Loading shop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-page">
      <div className="container">
        <div className="shop-header">
          <div>
            <h1>Shop</h1>
            <p>Purchase boosts and items with your gold</p>
          </div>
          <div className="gold-balance">
            <Coins size={24} />
            <span>{user.gold || 0} Gold</span>
            <button className="gold-transfer-btn" onClick={() => setTransferModal(true)}>
              <Send size={14} /> Send Gold
            </button>
          </div>
        </div>

        {/* Transfer Modal */}
        {transferModal && (
          <div className="transfer-overlay" onClick={closeTransferModal}>
            <div className="transfer-modal" onClick={e => e.stopPropagation()}>
              <div className="transfer-modal-header">
                <div className="transfer-modal-title">
                  <Coins size={18} />
                  Send Gold
                </div>
                <button className="transfer-modal-close" onClick={closeTransferModal}><X size={18} /></button>
              </div>

              <div className="transfer-modal-body">
                <div className="transfer-field">
                  <label>Recipient username</label>
                  <input
                    className="transfer-input"
                    placeholder="Enter username..."
                    value={transferForm.recipient}
                    onChange={e => { setTransferForm(f => ({ ...f, recipient: e.target.value })); setTransferMsg({ text: '', ok: false }); }}
                    maxLength={32}
                    autoComplete="off"
                  />
                </div>

                <div className="transfer-field">
                  <label>Amount</label>
                  <div className="transfer-amount-wrap">
                    <Coins size={15} className="transfer-amount-icon" />
                    <input
                      className="transfer-input transfer-input-amount"
                      placeholder="0"
                      value={transferForm.amount}
                      onChange={e => handleAmountChange(e.target.value)}
                      inputMode="numeric"
                    />
                    <span className="transfer-balance">Balance: {user.gold || 0}</span>
                  </div>
                </div>

                {transferPreview && (
                  <div className="transfer-preview">
                    <div className="transfer-preview-row">
                      <span>You send</span>
                      <span className="transfer-preview-value">{transferPreview.sent} gold</span>
                    </div>
                    <div className="transfer-preview-row commission">
                      <span>10% site commission</span>
                      <span className="transfer-preview-commission">−{transferPreview.commission} gold</span>
                    </div>
                    <div className="transfer-preview-divider" />
                    <div className="transfer-preview-row total">
                      <span>Recipient receives</span>
                      <span className="transfer-preview-total">{transferPreview.received} gold</span>
                    </div>
                  </div>
                )}

                <p className="transfer-note">A 10% commission is deducted from each transfer by the site.</p>

                {transferMsg.text && (
                  <div className={`transfer-msg ${transferMsg.ok ? 'success' : 'error'}`}>{transferMsg.text}</div>
                )}
              </div>

              <div className="transfer-modal-footer">
                <button className="transfer-cancel-btn" onClick={closeTransferModal}>Cancel</button>
                <button
                  className="transfer-send-btn"
                  onClick={handleTransfer}
                  disabled={transferLoading || !transferForm.recipient.trim() || !transferForm.amount || transferPreview?.sent > (user.gold || 0)}
                >
                  <Send size={14} /> {transferLoading ? 'Sending...' : 'Send Gold'}
                </button>
              </div>
            </div>
          </div>
        )}

        {specialOffers.length > 0 && (
          <div className="shop-section">
            <h2>Special Offers</h2>
            <div className="special-offers-carousel">
              <button className="carousel-btn prev" onClick={prevSlide}>
                <ChevronLeft size={24} />
              </button>
              
              <div className="carousel-container">
                <div 
                  className="carousel-track" 
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {specialOffers.map((item) => {
                    const Icon = iconMap[item.icon] || Zap;
                    return (
                      <div key={item.itemId} className="special-offer-item">
                        {item.originalPrice && (
                          <span className="sale-badge">SALE</span>
                        )}
                        <div className="offer-icon">
                          <Icon size={48} />
                        </div>
                        <h3>{item.name}</h3>
                        <p>{item.description}</p>
                        <div className="price">
                          {item.originalPrice && (
                            <span className="old-price">{item.originalPrice} Gold</span>
                          )}
                          <div className="new-price">
                            <Coins size={20} />
                            <span>{item.price} Gold</span>
                          </div>
                        </div>
                        <button 
                          className={`btn btn-primary ${purchasing ? 'disabled' : ''}`}
                          onClick={() => handlePurchase(item.itemId)}
                          disabled={purchasing}
                        >
                          {purchasing ? 'Processing...' : 'Purchase Now'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button className="carousel-btn next" onClick={nextSlide}>
                <ChevronRight size={24} />
              </button>

              <div className="carousel-indicators">
                {specialOffers.map((_, index) => (
                  <button
                    key={index}
                    className={`indicator ${index === currentSlide ? 'active' : ''}`}
                    onClick={() => goToSlide(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="shop-section">
          <h2>All Items</h2>
          <div className="items-grid">
            {[...specialOffers, ...regularItems].map((item) => {
              const Icon = iconMap[item.icon] || Zap;
              return (
                <div key={item.itemId} className="shop-item">
                  {item.originalPrice && (
                    <span className="sale-badge">SALE</span>
                  )}
                  <div className="shop-item-icon">
                    <Icon size={32} />
                  </div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="item-footer">
                    <div className="price">
                      {item.originalPrice && (
                        <span className="old-price">{item.originalPrice}</span>
                      )}
                      <div className="new-price">
                        <Coins size={16} />
                        <span>{item.price}</span>
                      </div>
                    </div>
                    <button 
                      className={`btn btn-primary ${purchasing ? 'disabled' : ''}`}
                      onClick={() => handlePurchase(item.itemId)}
                      disabled={purchasing}
                    >
                      {purchasing ? 'Processing...' : 'Buy'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Custom Dialog */}
      {dialog.show && (
        <div className="shop-dialog-overlay" onClick={closeDialog}>
          <div className="shop-dialog" onClick={(e) => e.stopPropagation()}>
            <div className={`shop-dialog-header ${dialog.type}`}>
              <div className="shop-dialog-icon">
                {dialog.type === 'success' ? '✅' : '❌'}
              </div>
              <h3 className="shop-dialog-title">{dialog.title}</h3>
            </div>
            <div className="shop-dialog-body">
              <p>{dialog.message}</p>
            </div>
            <div className="shop-dialog-footer">
              <button className="btn btn-primary" onClick={closeDialog}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
