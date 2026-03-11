import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { Zap, Sparkles, RotateCcw, ShoppingBag, Coins, ChevronLeft, ChevronRight } from 'lucide-react';
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
          </div>
        </div>

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
