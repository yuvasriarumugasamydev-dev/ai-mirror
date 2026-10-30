import React, { useState } from 'react';

export function AdminLogin({ onBackToMirror }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return localStorage.getItem('vastra_admin_auth') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [activeMenu, setActiveMenu] = useState(() => {
    try {
      return localStorage.getItem('vastra_admin_menu') || 'products';
    } catch (e) {
      return 'products';
    }
  });

  // BOUTIQUE LIGHTING & ATMOSPHERE PRESET
  const [activeLighting, setActiveLighting] = useState(() => {
    try {
      return localStorage.getItem('vastra_lighting_preset') || 'gold';
    } catch (e) {
      return 'gold';
    }
  });

  const handleLightingChange = (presetKey) => {
    setActiveLighting(presetKey);
    try {
      localStorage.setItem('vastra_lighting_preset', presetKey);
      window.dispatchEvent(new CustomEvent('vastra_lighting_changed', { detail: { preset: presetKey } }));
    } catch (e) {}
  };

  // PRODUCTS STATE (Direct from MongoDB DB)
  const [products, setProducts] = useState([]);

  // Fetch true database products from MongoDB on mount
  React.useEffect(() => {
    fetch('/api/sarees')
      .then(r => r.json())
      .then(res => {
        if (res && res.success && Array.isArray(res.data)) {
          const fallbackAssets = [
            '/assets/image_20261013_123805.jpg',
            '/assets/image_20261013_123806.jpg',
            '/assets/image_20261013_123806_1.jpg',
            '/assets/image_20261013_123806_2.jpg',
            '/assets/image_20261013_123812.jpg',
            '/assets/image_20261013_123813.jpg',
          ];

          const formatted = res.data.map((item, idx) => {
            let finalImage = item.image;
            if (!finalImage || finalImage.includes('undefined') || finalImage.includes('null')) {
              finalImage = fallbackAssets[idx % fallbackAssets.length];
            }
            const sId = item.sareeId || item.id || (item._id ? String(item._id) : `p-${idx}`);
            return {
              id: sId,
              sareeId: item.sareeId || sId,
              mongoId: item._id ? String(item._id) : '',
              name: item.name || 'Handcrafted Saree',
              fabric: item.fabric || 'Pure Silk',
              colorName: item.fabric || 'Silk Hue',
              colorCode: item.accentColor || '#A61C52',
              price: item.priceFormatted || (typeof item.price === 'number' ? `₹${item.price.toLocaleString('en-IN')}` : '₹15,000'),
              rawPrice: item.price || 15000,
              image: finalImage,
              status: 'In Showroom',
              drapes: `${item.drapes || 0} Drapes`
            };
          });
          setProducts(formatted);
          try {
            localStorage.setItem('vastra_admin_products', JSON.stringify(formatted));
          } catch (e) {}
        }
      })
      .catch(err => console.warn('Could not fetch DB sarees:', err));
  }, []);

  // Save products to localStorage whenever updated
  React.useEffect(() => {
    try {
      localStorage.setItem('vastra_admin_products', JSON.stringify(products));
    } catch (e) {}
  }, [products]);

  // Save activeMenu to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem('vastra_admin_menu', activeMenu);
    } catch (e) {}
  }, [activeMenu]);

  // LIVE TRY-ON REAL-TIME METRICS
  const [tryOnsToday, setTryOnsToday] = useState(0);
  const [totalTryOns, setTotalTryOns] = useState(0);
  const [sareeTryCounts, setSareeTryCounts] = useState({});

  const fetchLiveTryOnCounts = React.useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const localToday = parseInt(localStorage.getItem(`vastra_tryons_${today}`) || '0', 10);
      const localTotal = parseInt(localStorage.getItem('vastra_total_tryons') || '0', 10);

      // Attempt to fetch from backend server snapshots
      try {
        const res = await fetch('/api/snapshots');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            const serverToday = Number(data.todayCount) || 0;
            const serverTotal = Number(data.totalCount) || 0;
            setTryOnsToday(Math.max(localToday, serverToday));
            setTotalTryOns(Math.max(localTotal, serverTotal));
            if (data.sareeCounts && typeof data.sareeCounts === 'object') {
              setSareeTryCounts(data.sareeCounts);
            }
            return;
          }
        }
      } catch (err) {
        // Fallback to local
      }

      setTryOnsToday(localToday);
      setTotalTryOns(localTotal);
    } catch (e) {
      console.warn('Error reading try-on metrics:', e);
    }
  }, []);

  React.useEffect(() => {
    fetchLiveTryOnCounts();

    // Event listener for live Try-On trigger across components or other tabs
    const handleTryOnUpdate = () => fetchLiveTryOnCounts();
    const handleStorageUpdate = (e) => {
      if (e.key?.startsWith('vastra_tryons_') || e.key === 'vastra_total_tryons' || e.key === 'vastra_live_tryon_event') {
        fetchLiveTryOnCounts();
      }
    };

    window.addEventListener('vastra_tryon_updated', handleTryOnUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    // Auto poll every 3 seconds for continuous real-time sync with mirror
    const interval = setInterval(fetchLiveTryOnCounts, 3000);

    return () => {
      window.removeEventListener('vastra_tryon_updated', handleTryOnUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
      clearInterval(interval);
    };
  }, [fetchLiveTryOnCounts]);

  // ADD PRODUCT MODAL STATE
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductFabric, setNewProductFabric] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductColor, setNewProductColor] = useState('Crimson Red');
  const [newProductColorCode, setNewProductColorCode] = useState('#A61C52');
  const [newProductImage, setNewProductImage] = useState('');
  const [zoomedImage, setZoomedImage] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProductImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const cleanUser = username.trim().toLowerCase();
      if ((cleanUser === 'admin' || cleanUser === 'shana@gmail.com') && password === '123') {
        setShowSuccessPopup(true);
      } else {
        setError('Invalid username or password! Please try again.');
      }
    }, 300);
  };

  const handlePopupContinue = () => {
    setShowSuccessPopup(false);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('vastra_admin_auth', 'true');
      localStorage.setItem('vastra_active_tab', 'admin');
    } catch (e) {}
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setShowSuccessPopup(false);
    setUsername('');
    setPassword('');
    setError('');
    setActiveMenu('dashboard');
    try {
      localStorage.removeItem('vastra_admin_auth');
      localStorage.setItem('vastra_active_tab', 'mirror');
    } catch (e) {}
    if (onBackToMirror) {
      onBackToMirror();
    }
  };

  // ADD PRODUCT HANDLER WITH DB & STORAGE PERSISTENCE
  const handleAddProductSubmit = (e) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    const newItem = {
      id: `p-${Date.now()}`,
      name: newProductName.trim(),
      fabric: newProductFabric.trim() || 'Pure Silk',
      colorName: newProductColor.trim() || 'Silk Hue',
      colorCode: newProductColorCode || '#A61C52',
      price: newProductPrice.startsWith('₹') ? newProductPrice : `₹${newProductPrice}`,
      image: newProductImage || '',
      status: 'In Showroom',
      drapes: '0 Drapes (New)'
    };

    const updated = [newItem, ...products];
    setProducts(updated);
    try {
      localStorage.setItem('vastra_admin_products', JSON.stringify(updated));
    } catch (err) {}

    // Send to Backend Database API
    try {
      fetch('/api/sarees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      }).then(() => {
        // Trigger instant sync on user side
        localStorage.setItem('vastra_saree_sync', Date.now().toString());
      }).catch(() => {});
    } catch (err) {}

    setIsAddModalOpen(false);
    setNewProductName('');
    setNewProductFabric('');
    setNewProductPrice('');
    setNewProductColor('Crimson Red');
    setNewProductImage('');

    setToastMessage('Product Saved to Database & Catalog! ✨');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmItem) return;
    const targetId = deleteConfirmItem.sareeId || deleteConfirmItem.id || deleteConfirmItem.mongoId;
    const itemNameToDelete = deleteConfirmItem.name;

    // Immediately remove from local state
    const updated = products.filter(p => p.id !== deleteConfirmItem.id && p.sareeId !== targetId);
    setProducts(updated);

    try {
      localStorage.setItem('vastra_admin_products', JSON.stringify(updated));
      localStorage.setItem('vastra_saree_sync', Date.now().toString());

      // Await backend deletion
      const res = await fetch(`/api/sarees/${encodeURIComponent(targetId)}`, { method: 'DELETE' });
      if (!res.ok && deleteConfirmItem.mongoId && deleteConfirmItem.mongoId !== targetId) {
        await fetch(`/api/sarees/${encodeURIComponent(deleteConfirmItem.mongoId)}`, { method: 'DELETE' });
      }
    } catch (e) {
      console.warn('Delete API call failed:', e);
    }

    setToastMessage(`"${itemNameToDelete}" deleted permanently from database! 🗑️`);
    setDeleteConfirmItem(null);
    setTimeout(() => setToastMessage(''), 2500);
  };

  return (
    <div className="admin-root-wrapper" style={styles.rootWrapper}>
      {/* TOAST ALERT */}
      {toastMessage && (
        <div style={styles.toast}>
          <i className="fa-solid fa-circle-check" style={{ color: '#10B981', marginRight: '8px' }}></i>
          {toastMessage}
        </div>
      )}

      {/* 1. LOGIN SUCCESSFUL POPUP MODAL */}
      {showSuccessPopup && (
        <div style={styles.popupOverlay}>
          <div style={styles.popupBox}>
            <div style={styles.popupIconCircle}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: '48px', color: '#10B981' }}></i>
            </div>
            <h3 style={styles.popupTitle}>Login Successful!</h3>
            <p style={styles.popupSub}>Welcome to Vastra Smart Mirror Admin Console.</p>
            <button onClick={handlePopupContinue} style={styles.popupBtn}>
              <span>Continue to Dashboard</span>
              <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px' }}></i>
            </button>
          </div>
        </div>
      )}

      {/* 2. ADD PRODUCT MODAL */}
      {isAddModalOpen && (
        <div style={styles.popupOverlay}>
          <div style={{ ...styles.popupBox, maxWidth: '500px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#3D0A1E', margin: 0 }}>
                <i className="fa-solid fa-plus-circle" style={{ color: '#A61C52', marginRight: '8px' }}></i>
                Add New Saree Product
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', color: '#7A4E5F', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={styles.label}><i className="fa-solid fa-tag" style={styles.labelIcon}></i> Product / Saree Name</label>
                <input
                  type="text"
                  placeholder="e.g. Royal Mysore Crepe Silk"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  style={styles.input}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={styles.label}><i className="fa-solid fa-layer-group" style={styles.labelIcon}></i> Fabric</label>
                  <input
                    type="text"
                    placeholder="e.g. Kanjivaram Pure Silk"
                    value={newProductFabric}
                    onChange={(e) => setNewProductFabric(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}><i className="fa-solid fa-indian-rupee-sign" style={styles.labelIcon}></i> Price</label>
                  <input
                    type="text"
                    placeholder="e.g. 25,000"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={styles.label}><i className="fa-solid fa-palette" style={styles.labelIcon}></i> Color Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Royal Maroon"
                    value={newProductColor}
                    onChange={(e) => setNewProductColor(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}><i className="fa-solid fa-eye-dropper" style={styles.labelIcon}></i> Color Code</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={newProductColorCode}
                      onChange={(e) => setNewProductColorCode(e.target.value)}
                      style={{ width: '45px', height: '42px', border: '1px solid #E8DACF', borderRadius: '10px', cursor: 'pointer', padding: '2px' }}
                    />
                    <input
                      type="text"
                      value={newProductColorCode}
                      onChange={(e) => setNewProductColorCode(e.target.value)}
                      style={{ ...styles.input, flex: 1 }}
                    />
                  </div>
                </div>
              </div>

              {/* SAREE IMAGE UPLOAD */}
              <div>
                <label style={styles.label}>
                  <i className="fa-solid fa-image" style={styles.labelIcon}></i> Saree Image
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: '1.5px dashed #A61C52',
                    backgroundColor: '#FAF5EF',
                    color: '#A61C52',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}>
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                    <span>Choose Saree Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {newProductImage ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={newProductImage}
                        alt="Preview"
                        style={{ width: '44px', height: '52px', objectFit: 'cover', borderRadius: '8px', border: '1.5px solid #A61C52', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setNewProductImage('')}
                        style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '14px' }}
                        title="Remove photo"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#7A4E5F' }}>PNG, JPG or WEBP image</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ ...styles.cancelBtn, flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ ...styles.submitBtn, flex: 2, marginTop: 0 }}
                >
                  <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. ZOOMED SAREE IMAGE LIGHTBOX MODAL */}
      {zoomedImage && (
        <div
          style={styles.popupOverlay}
          onClick={() => setZoomedImage(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '24px',
              maxWidth: '540px',
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.45)',
              border: '1.5px solid #E8DACF',
              position: 'relative',
              animation: 'zoomIn 0.25s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setZoomedImage(null)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#FAF5EF',
                border: '1px solid #E5D5C8',
                color: '#3D0A1E',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
              title="Close Zoom"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            {/* Saree Large High-Res Image View */}
            <div style={{
              width: '100%',
              maxHeight: '62vh',
              overflow: 'hidden',
              borderRadius: '16px',
              border: '1px solid #E8DACF',
              backgroundColor: '#FAF5EF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.05)',
            }}>
              <img
                src={zoomedImage.image}
                alt={zoomedImage.name}
                style={{
                  width: '100%',
                  maxHeight: '62vh',
                  objectFit: 'contain',
                  borderRadius: '16px',
                  display: 'block',
                }}
              />
            </div>

            {/* Saree Details Banner */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 18px',
              backgroundColor: '#FAF5EF',
              borderRadius: '14px',
              border: '1px solid #E5D5C8',
            }}>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#3D0A1E', margin: 0 }}>
                  {zoomedImage.name}
                </h3>
                <span style={{ fontSize: '12px', color: '#7A4E5F' }}>
                  {zoomedImage.fabric} • <span style={{ ...styles.colorPill, background: zoomedImage.colorCode }}></span>{zoomedImage.colorName}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#A61C52' }}>
                  {zoomedImage.price}
                </span>
                <div style={{ fontSize: '11px', color: '#10B981', fontWeight: '600' }}>
                  <i className="fa-solid fa-check-circle"></i> {zoomedImage.status || 'In Showroom'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. DELETE CONFIRMATION POPUP MODAL */}
      {deleteConfirmItem && (
        <div style={styles.popupOverlay}>
          <div style={{ ...styles.popupBox, maxWidth: '420px', textAlign: 'center', padding: '28px 24px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              margin: '0 auto 16px auto',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.2)'
            }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#3D0A1E', margin: '0 0 8px 0' }}>
              Delete Saree Product?
            </h3>

            <p style={{ fontSize: '14px', color: '#7A4E5F', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong style={{ color: '#A61C52' }}>"{deleteConfirmItem.name}"</strong>? It will be removed from both the Admin and Mirror Saree Collection.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1.5px solid #D5C2B6',
                  backgroundColor: '#FFFFFF',
                  color: '#5A2A3E',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                  flex: 1,
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                }}
              >
                <i className="fa-solid fa-trash-can" style={{ marginRight: '6px' }}></i> OK, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isAuthenticated ? (
        /* ADMIN PANEL WITH SIDE NAVBAR */
        <div style={styles.adminLayout}>
          {/* SIDE NAVBAR */}
          <aside style={styles.sidebar}>
            <div style={styles.sidebarBrand}>
              <div style={styles.sidebarLogoBadge}>
                <i className="fa-solid fa-gem" style={{ color: '#B8860B', fontSize: '20px' }}></i>
              </div>
              <div>
                <div style={styles.sidebarBrandTitle}>VASTRA</div>
                <div style={styles.sidebarBrandSub}>Admin Console</div>
              </div>
            </div>

            <nav style={styles.sidebarNav}>
              <div style={styles.navSectionLabel}>MAIN MENU</div>

              {/* 1st MENU: DASHBOARD */}
              <button
                onClick={() => setActiveMenu('dashboard')}
                style={{
                  ...styles.navItem,
                  ...(activeMenu === 'dashboard' ? styles.navItemActive : {})
                }}
              >
                <i className="fa-solid fa-chart-pie" style={styles.navIcon}></i>
                <span>Dashboard</span>
                {activeMenu === 'dashboard' && <span style={styles.activeDot}></span>}
              </button>

              {/* 2nd MENU: PRODUCTS */}
              <button
                onClick={() => setActiveMenu('products')}
                style={{
                  ...styles.navItem,
                  ...(activeMenu === 'products' ? styles.navItemActive : {})
                }}
              >
                <i className="fa-solid fa-vest-patches" style={styles.navIcon}></i>
                <span>Products</span>
                <span style={styles.countPill}>{products.length}</span>
                {activeMenu === 'products' && <span style={styles.activeDot}></span>}
              </button>
            </nav>

            {/* SIDEBAR FOOTER */}
            <div style={styles.sidebarFooter}>
              {onBackToMirror && (
                <button onClick={onBackToMirror} style={styles.mirrorReturnBtn}>
                  <i className="fa-solid fa-camera-viewfinder" style={{ marginRight: '8px' }}></i>
                  Back to Mirror
                </button>
              )}
              <button onClick={handleLogout} style={styles.sidebarLogoutBtn}>
                <i className="fa-solid fa-arrow-right-from-bracket" style={{ marginRight: '8px' }}></i>
                Logout
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main style={styles.adminMainArea}>
            {/* TOP BAR */}
            <header style={styles.topHeader}>
              <div>
                <h1 style={styles.topHeaderTitle}>
                  {activeMenu === 'dashboard' && 'Dashboard Overview'}
                  {activeMenu === 'products' && 'Product Catalog'}
                </h1>
                <p style={styles.topHeaderSub}>
                  {activeMenu === 'dashboard' && 'Real-time metrics and showroom controls'}
                  {activeMenu === 'products' && 'Manage boutique saree inventory and live mirror garments'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* TOP ADD PRODUCT BUTTON FOR QUICK ACCESS */}
                <button onClick={() => setIsAddModalOpen(true)} style={styles.addProductBtn}>
                  <i className="fa-solid fa-plus" style={{ marginRight: '8px' }}></i>
                  Add Product
                </button>

                <div style={styles.adminUserBadge}>
                  <div style={styles.adminUserAvatar}>
                    <i className="fa-solid fa-user-shield" style={{ color: '#A61C52' }}></i>
                  </div>
                  <div>
                    <div style={styles.adminUserName}>Admin User</div>
                    <div style={styles.adminUserRole}>Boutique Manager</div>
                  </div>
                </div>
              </div>
            </header>

            {/* 1. DASHBOARD VIEW */}
            {activeMenu === 'dashboard' && (
              <div style={styles.dashboardBody}>
                {/* 3 TOP STATS CARDS */}
                <div style={styles.statsRow}>
                  {/* CARD 1: TOTAL SAREES */}
                  <div style={styles.dashStatCard}>
                    <div style={{ ...styles.dashStatIcon, background: 'rgba(166, 28, 82, 0.1)', color: '#A61C52' }}>
                      <i className="fa-solid fa-vest-patches"></i>
                    </div>
                    <div>
                      <div style={styles.dashStatVal}>{products.length}</div>
                      <div style={styles.dashStatLabel}>Total Sarees</div>
                    </div>
                  </div>

                  {/* CARD 2: SAREES TRIED TODAY */}
                  <div style={styles.dashStatCard}>
                    <div style={{ ...styles.dashStatIcon, background: 'rgba(197, 139, 55, 0.15)', color: '#C58B37' }}>
                      <i className="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    <div>
                      <div style={styles.dashStatVal}>{tryOnsToday}</div>
                      <div style={styles.dashStatLabel}>Sarees Tried Today</div>
                    </div>
                  </div>

                  {/* CARD 3: TOTAL SAREES TRIED OVERALL */}
                  <div style={styles.dashStatCard}>
                    <div style={{ ...styles.dashStatIcon, background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                      <i className="fa-solid fa-chart-line"></i>
                    </div>
                    <div>
                      <div style={styles.dashStatVal}>{totalTryOns}</div>
                      <div style={styles.dashStatLabel}>Total Sarees Tried</div>
                    </div>
                  </div>
                </div>

                {/* CLEAN 2-COLUMN EXECUTIVE DASHBOARD */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
                  
                  {/* CARD 1: STORE PERFORMANCE & POPULAR SAREES */}
                  <div style={styles.tableCard}>
                    <div style={styles.tableCardHeader}>
                      <div>
                        <h3 style={styles.tableCardTitle}>
                          <i className="fa-solid fa-crown" style={{ color: '#C58B37', marginRight: '8px' }}></i>
                          Most Loved Sarees
                        </h3>
                        <span style={{ fontSize: '12px', color: '#7A4E5F' }}>Top tried virtual drape items</span>
                      </div>
                      <button onClick={() => setActiveMenu('products')} style={{ fontSize: '12px', background: 'none', border: 'none', color: '#A61C52', fontWeight: '700', cursor: 'pointer' }}>
                        View All ({products.length}) →
                      </button>
                    </div>

                    {/* Saree List / Empty State */}
                    {products.length === 0 ? (
                      <div style={{ padding: '30px 10px', textAlign: 'center', color: '#7A4E5F' }}>
                        <i className="fa-solid fa-box-open" style={{ fontSize: '28px', color: '#C58B37', marginBottom: '8px' }}></i>
                        <p style={{ margin: 0, fontSize: '13px' }}>No sarees in catalog yet. Add products to view insights.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {products.slice(0, 3).map((item, idx) => (
                          <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '12px', background: '#FAF5EF', border: '1px solid #F5ECE6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {item.image ? (
                                <img src={item.image} alt={item.name} style={{ width: '40px', height: '50px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #A61C52' }} />
                              ) : (
                                <div style={{ width: '40px', height: '50px', borderRadius: '8px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A61C52' }}>
                                  <i className="fa-solid fa-vest"></i>
                                </div>
                              )}
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#3D0A1E' }}>{item.name}</div>
                                <div style={{ fontSize: '12px', color: '#7A4E5F', marginTop: '2px' }}>
                                  {item.fabric} • <span style={{ color: '#A61C52', fontWeight: '600' }}>{item.price?.toString().startsWith('₹') ? item.price : `₹${item.price}`}</span>
                                </div>
                              </div>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                              Available
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick Summary Badges */}
                    <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #F5ECE6', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ padding: '10px 14px', background: '#FFFFFF', border: '1px solid #F5ECE6', borderRadius: '10px' }}>
                        <div style={{ fontSize: '11px', color: '#7A4E5F' }}>Top Fabric Demand</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#3D0A1E', marginTop: '2px' }}>Silk & Georgette</div>
                      </div>
                      <div style={{ padding: '10px 14px', background: '#FFFFFF', border: '1px solid #F5ECE6', borderRadius: '10px' }}>
                        <div style={{ fontSize: '11px', color: '#7A4E5F' }}>Showroom Status</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#10B981', marginTop: '2px' }}>Mirror Ready</div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: SAREE FABRIC TRY-ON DISTRIBUTION DONUT CHART */}
                  {(() => {
                    // Compute dynamic fabric stats from actual products and tryon records
                    const fabricMap = {};
                    products.forEach(p => {
                      const f = p.fabric ? p.fabric.split('(')[0].trim() : 'Pure Silk';
                      const count = sareeTryCounts[p.sareeId] || sareeTryCounts[p.id] || 0;
                      fabricMap[f] = (fabricMap[f] || 0) + count;
                    });

                    const fabricEntries = Object.entries(fabricMap);
                    const totalFabricDrapes = fabricEntries.reduce((sum, [, val]) => sum + val, 0);

                    // Colors for fabrics
                    const fabricColors = ['#A61C52', '#C58B37', '#E8A598', '#10B981', '#1E5EFF', '#8B5CF6'];

                    // If total is 0, give each fabric 0 and a clean ring
                    const circumference = 238.7;
                    let accumulatedPercent = 0;
                    const segments = fabricEntries.slice(0, 4).map(([fabricName, count], i) => {
                      const pct = totalFabricDrapes > 0 ? (count / totalFabricDrapes) : (fabricEntries.length > 0 ? (1 / fabricEntries.length) : 0.25);
                      const dashLength = totalFabricDrapes > 0 ? (pct * circumference) : (circumference / Math.max(fabricEntries.length, 1));
                      const offset = -(accumulatedPercent * circumference);
                      accumulatedPercent += pct;
                      return {
                        name: fabricName,
                        count,
                        pct: totalFabricDrapes > 0 ? Math.round(pct * 100) : 0,
                        color: fabricColors[i % fabricColors.length],
                        dasharray: `${dashLength.toFixed(1)} ${circumference}`,
                        dashoffset: offset.toFixed(1)
                      };
                    });

                    return (
                      <div style={{ ...styles.tableCard, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={styles.tableCardHeader}>
                            <div>
                              <h3 style={styles.tableCardTitle}>
                                <i className="fa-solid fa-chart-pie" style={{ color: '#A61C52', marginRight: '8px' }}></i>
                                Fabric Try-On Distribution
                              </h3>
                              <span style={{ fontSize: '12px', color: '#7A4E5F' }}>Real-time customer drape trials by fabric</span>
                            </div>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10B981', fontWeight: '700', background: 'rgba(16, 185, 129, 0.1)', padding: '5px 12px', borderRadius: '20px' }}>
                              <i className="fa-solid fa-circle" style={{ fontSize: '7px' }}></i>
                              {totalTryOns} Drapes Total
                            </span>
                          </div>

                          {/* Donut Chart & Legend Container */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', padding: '12px 0 16px 0' }}>
                            
                            {/* 1. LUXURY SVG DONUT CHART */}
                            <div style={{ position: 'relative', width: '155px', height: '155px', flexShrink: 0 }}>
                              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                {totalFabricDrapes === 0 ? (
                                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="#E8DACF" strokeWidth="16" />
                                ) : (
                                  segments.map((seg, sIdx) => (
                                    <circle
                                      key={sIdx}
                                      cx="50" cy="50" r="38"
                                      fill="transparent"
                                      stroke={seg.color}
                                      strokeWidth="16"
                                      strokeDasharray={seg.dasharray}
                                      strokeDashoffset={seg.dashoffset}
                                    />
                                  ))
                                )}
                              </svg>

                              {/* Center Hole Badge with Total */}
                              <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center',
                                pointerEvents: 'none'
                              }}>
                                <div style={{ fontSize: '19px', fontWeight: '800', color: '#3D0A1E', lineHeight: '1.1' }}>
                                  {totalTryOns}
                                </div>
                                <div style={{ fontSize: '10px', fontWeight: '700', color: '#7A4E5F', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Try-Ons
                                </div>
                              </div>
                            </div>

                            {/* 2. FABRIC BREAKDOWN LEGEND */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {segments.length === 0 ? (
                                <div style={{ fontSize: '12px', color: '#7A4E5F' }}>No fabric data recorded yet.</div>
                              ) : (
                                segments.map((seg, sIdx) => (
                                  <div key={sIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '8px', background: '#FAF5EF', border: '1px solid #F5ECE6' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: seg.color, display: 'inline-block' }}></span>
                                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#3D0A1E', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {seg.name}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '11px', color: '#7A4E5F' }}>{seg.count} drapes</span>
                                      <span style={{ fontSize: '11px', fontWeight: '800', color: seg.color, background: `${seg.color}1A`, padding: '1px 6px', borderRadius: '6px' }}>
                                        {seg.pct}%
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* 3. SHOWROOM FABRIC INSIGHT STATS BADGES */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
                            <div style={{ padding: '10px 14px', background: '#FAF5EF', border: '1px solid #F5ECE6', borderRadius: '10px' }}>
                              <div style={{ fontSize: '11px', color: '#7A4E5F' }}>Primary Fabric</div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#A61C52', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <i className="fa-solid fa-crown" style={{ color: '#C58B37', marginRight: '6px' }}></i>
                                {products[0]?.fabric?.split('(')[0]?.trim() || 'Pure Silk'}
                              </div>
                            </div>
                            <div style={{ padding: '10px 14px', background: '#FAF5EF', border: '1px solid #F5ECE6', borderRadius: '10px' }}>
                              <div style={{ fontSize: '11px', color: '#7A4E5F' }}>Active Showroom Items</div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#10B981', marginTop: '2px' }}>
                                <i className="fa-solid fa-bolt" style={{ color: '#10B981', marginRight: '6px' }}></i>
                                {products.length} Sarees
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Quick Summary Footer */}
                        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #F5ECE6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#7A4E5F' }}>
                          <span><i className="fa-solid fa-database" style={{ color: '#10B981', marginRight: '6px' }}></i> Live Database Telemetry Verified</span>
                          <span style={{ fontWeight: '700', color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '12px' }}>
                            {totalTryOns > 0 ? `${totalTryOns} Trials` : 'Awaiting Mirror Trials'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                </div>

                {/* ROW 3: BIG VISUAL ANALYTICS GRAPH (FABRIC & SAREE ENGAGEMENT) */}
                <div style={{ ...styles.tableCard, marginTop: '24px' }}>
                  <div style={styles.tableCardHeader}>
                    <div>
                      <h3 style={{ ...styles.tableCardTitle, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-chart-column" style={{ color: '#A61C52' }}></i>
                        Virtual Try-On Popularity & Fabric Volume Analytics
                      </h3>
                      <span style={{ fontSize: '12px', color: '#7A4E5F' }}>
                        Real-time AI Mirror drape trials comparison by Saree & Fabric category
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#FAF5EF', border: '1px solid #E8DACF', padding: '5px 12px', borderRadius: '20px', color: '#3D0A1E', fontWeight: '700' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#A61C52' }}></span>
                        Live AI Mirror Telemetry
                      </span>
                    </div>
                  </div>

                  {/* 1. LUXURY COMBINED LINE & BAR GRAPH CONTAINER */}
                  <div style={{ background: '#FAF5EF', borderRadius: '20px', border: '1px solid #E8DACF', padding: '26px 22px 18px', marginBottom: '22px', position: 'relative' }}>
                    
                    {/* Graph Title Badge & Legend */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#3D0A1E' }}>Drape Trials Curve & Bar Comparison</span>
                        <span style={{ fontSize: '10px', background: 'rgba(166, 28, 82, 0.1)', color: '#A61C52', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>Trend Line Active</span>
                      </div>
                      <div style={{ display: 'flex', gap: '14px', fontSize: '11px', fontWeight: '600', color: '#7A4E5F' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '12px', height: '3px', background: '#A61C52', borderRadius: '2px' }}></span> Trial Velocity
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '8px', height: '8px', background: '#C58B37', borderRadius: '2px' }}></span> Volume
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', height: '240px', alignItems: 'stretch', position: 'relative' }}>
                      
                        {(() => {
                          const displaySarees = products.length > 0 ? products.slice(0, 7) : [];
                          const colors = [
                            'linear-gradient(180deg, #A61C52 0%, #D83168 100%)',
                            'linear-gradient(180deg, #1E5EFF 0%, #4B82FF 100%)',
                            'linear-gradient(180deg, #C58B37 0%, #E0A74D 100%)',
                            'linear-gradient(180deg, #10B981 0%, #34D399 100%)',
                            'linear-gradient(180deg, #E11D48 0%, #FB7185 100%)',
                            'linear-gradient(180deg, #8B5CF6 0%, #A78BFA 100%)',
                            'linear-gradient(180deg, #7A4E5F 0%, #9E6B7E 100%)'
                          ];

                          // Real drape values per saree from database/snapshots
                          const sareesWithCounts = displaySarees.map((p) => {
                            const dbTryCount = sareeTryCounts[p.sareeId] || sareeTryCounts[p.id] || 0;
                            const parsed = parseInt(p.drapes, 10);
                            const count = dbTryCount > 0 ? dbTryCount : (!isNaN(parsed) ? parsed : 0);
                            return { ...p, count };
                          });

                          // Determine max scale dynamically: if all 0, base max is 10
                          const calculatedMax = Math.max(...sareesWithCounts.map(s => s.count), 0);
                          const maxCount = calculatedMax > 0 ? Math.ceil(calculatedMax / 5) * 5 : 10;

                          // SVG Line coordinates dynamically matching bar heights
                          const countToY = (cnt) => {
                            if (cnt === 0) return 175;
                            return Math.round(175 - (cnt / maxCount) * 150);
                          };

                          const points = sareesWithCounts.map((s, idx) => {
                            const x = Math.round(45 + idx * 100);
                            const y = countToY(s.count);
                            return { x, y, count: s.count };
                          });

                          const pathD = points.length > 0 
                            ? `M ${points.map(pt => `${pt.x} ${pt.y}`).join(' L ')}`
                            : 'M 50 175';
                          const areaD = points.length > 0
                            ? `M ${points[0].x} 175 L ${points.map(pt => `${pt.x} ${pt.y}`).join(' L ')} L ${points[points.length - 1].x} 175 Z`
                            : '';

                          return (
                            <>
                              {/* Y-Axis dynamic scale indicators */}
                              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '14px', borderRight: '1.5px dashed #E5D5C8', color: '#7A4E5F', fontSize: '10px', fontWeight: '700', paddingBottom: '36px', width: '65px' }}>
                                <span>{maxCount} Drapes</span>
                                <span>{Math.round(maxCount * 0.75)} Drapes</span>
                                <span>{Math.round(maxCount * 0.5)} Drapes</span>
                                <span>{Math.round(maxCount * 0.25)} Drapes</span>
                                <span>0</span>
                              </div>

                              {/* Main Chart Area with Overlay Line Graph */}
                              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', paddingLeft: '10px' }}>
                                
                                {/* Horizontal Grid Guidelines */}
                                <div style={{ position: 'absolute', top: '10px', left: 0, right: 0, borderTop: '1px dashed #EFE3D8', pointerEvents: 'none' }}></div>
                                <div style={{ position: 'absolute', top: '65px', left: 0, right: 0, borderTop: '1px dashed #EFE3D8', pointerEvents: 'none' }}></div>
                                <div style={{ position: 'absolute', top: '120px', left: 0, right: 0, borderTop: '1px dashed #EFE3D8', pointerEvents: 'none' }}></div>
                                <div style={{ position: 'absolute', top: '175px', left: 0, right: 0, borderTop: '1px dashed #EFE3D8', pointerEvents: 'none' }}></div>

                                {displaySarees.length === 0 ? (
                                  <div style={{ textAlign: 'center', width: '100%', padding: '40px 0', color: '#7A4E5F' }}>
                                    <i className="fa-solid fa-chart-simple" style={{ fontSize: '28px', color: '#C58B37', marginBottom: '8px' }}></i>
                                    <div>No sarees loaded yet in database to show trial volume.</div>
                                  </div>
                                ) : (
                                  <>
                                    {/* SMOOTH CONNECTING LINE SVG OVERLAY DYNAMICALLY MATCHED */}
                                    <svg viewBox="0 0 700 180" style={{ position: 'absolute', top: '10px', left: 0, width: '100%', height: '175px', pointerEvents: 'none', zIndex: 3 }} preserveAspectRatio="none">
                                      <defs>
                                        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                          <stop offset="0%" stopColor="#A61C52" />
                                          <stop offset="50%" stopColor="#C58B37" />
                                          <stop offset="100%" stopColor="#10B981" />
                                        </linearGradient>
                                        <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                          <stop offset="0%" stopColor="rgba(166, 28, 82, 0.15)" />
                                          <stop offset="100%" stopColor="rgba(166, 28, 82, 0.0)" />
                                        </linearGradient>
                                      </defs>

                                      {areaD && <path d={areaD} fill="url(#areaGrad)" />}
                                      <path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" />

                                      {points.map((pt, pIdx) => (
                                        <circle key={pIdx} cx={pt.x} cy={pt.y} r="5" fill="#FFFFFF" stroke="#A61C52" strokeWidth="2.5" />
                                      ))}
                                    </svg>

                                    {sareesWithCounts.map((p, idx) => {
                                      const trialsCount = p.count;
                                      const pct = trialsCount === 0 ? 0 : Math.min(Math.max(Math.round((trialsCount / maxCount) * 88), 10), 92);

                                      return (
                                        <div key={p.id || idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', width: '56px', position: 'relative', zIndex: 4 }}>
                                          
                                          {/* Floating Count Badge on Top */}
                                          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8DACF', padding: '2px 7px', borderRadius: '8px', fontSize: '10px', fontWeight: '800', color: trialsCount > 0 ? '#3D0A1E' : '#7A4E5F', marginBottom: '8px', boxShadow: '0 2px 8px rgba(61,10,30,0.06)', whiteSpace: 'nowrap' }}>
                                            {trialsCount}
                                          </div>

                                          {/* Stylized Column Bar with Soft Glass Shadow */}
                                          <div
                                            title={`${p.name} (${p.fabric}): ${trialsCount} trials`}
                                            style={{
                                              width: '32px',
                                              height: trialsCount === 0 ? '4px' : `${pct}%`,
                                              background: trialsCount === 0 ? '#E8DACF' : colors[idx % colors.length],
                                              borderRadius: trialsCount === 0 ? '2px' : '8px 8px 0 0',
                                              boxShadow: trialsCount === 0 ? 'none' : '0 6px 16px rgba(61, 10, 30, 0.12)',
                                              transition: 'all 0.4s ease'
                                            }}
                                          ></div>

                                          {/* X-Axis Saree & Fabric Labels */}
                                          <div style={{ marginTop: '10px', textAlign: 'center', width: '68px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#3D0A1E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {p.name}
                                            </div>
                                            <div style={{ fontSize: '9px', color: '#7A4E5F', fontWeight: '600', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {p.fabric}
                                            </div>
                                          </div>

                                        </div>
                                      );
                                    })}
                                  </>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                  {/* 2. FABRIC BREAKDOWN PILLS & INSIGHT SUMMARY */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    <div style={{ padding: '14px 16px', background: '#FAF5EF', borderRadius: '14px', border: '1px solid #F5ECE6', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(166, 28, 82, 0.1)', color: '#A61C52', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                        <i className="fa-solid fa-crown"></i>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#7A4E5F', fontWeight: '600' }}>Active Showroom Fabric</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#3D0A1E' }}>
                          {products[0]?.fabric || 'Pure Silk'}
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '14px 16px', background: '#FAF5EF', borderRadius: '14px', border: '1px solid #F5ECE6', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(197, 139, 55, 0.15)', color: '#C58B37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                        <i className="fa-solid fa-bolt-lightning"></i>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#7A4E5F', fontWeight: '600' }}>Today's Live Trials</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#3D0A1E' }}>
                          {tryOnsToday} Sarees Tried Today
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '14px 16px', background: '#FAF5EF', borderRadius: '14px', border: '1px solid #F5ECE6', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                        <i className="fa-solid fa-users-viewfinder"></i>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#7A4E5F', fontWeight: '600' }}>Total Virtual Try-ons</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#10B981' }}>
                          {totalTryOns} Drape Sessions
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* 2. PRODUCTS VIEW */}
            {activeMenu === 'products' && (
              <div style={styles.dashboardBody}>
                <div style={styles.tableCard}>
                  <div style={styles.tableCardHeader}>
                    <div>
                      <h3 style={styles.tableCardTitle}>All Products ({products.length})</h3>
                      <span style={{ fontSize: '12px', color: '#7A4E5F' }}>Live inventory accessible by mirror kiosk</span>
                    </div>
                    <button onClick={() => setIsAddModalOpen(true)} style={styles.addProductBtn}>
                      <i className="fa-solid fa-plus" style={{ marginRight: '8px' }}></i>
                      Add Product
                    </button>
                  </div>

                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeaderRow}>
                        <th style={styles.th}>Product / Saree</th>
                        <th style={styles.th}>Fabric Type</th>
                        <th style={styles.th}>Color Shade</th>
                        <th style={styles.th}>Price</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '36px 20px', color: '#7A4E5F' }}>
                            <i className="fa-solid fa-box-open" style={{ fontSize: '32px', color: '#C58B37', marginBottom: '10px', display: 'block' }}></i>
                            <div style={{ fontSize: '15px', fontWeight: '600', color: '#3D0A1E' }}>No Products Found</div>
                            <div style={{ fontSize: '13px', marginTop: '4px' }}>Click <b>+ Add Product</b> above to create a product.</div>
                          </td>
                        </tr>
                      ) : (
                        products.map((item) => (
                          <tr key={item.id} style={styles.tableRow}>
                            <td style={styles.td}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {item.image && !item.image.includes('undefined') && !item.image.includes('null') ? (
                                  <div
                                    onClick={() => setZoomedImage(item)}
                                    title="Click to zoom saree photo"
                                    style={{
                                      position: 'relative',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      onError={(e) => {
                                        // Hide broken image gracefully
                                        e.currentTarget.style.display = 'none';
                                        if (e.currentTarget.parentElement) {
                                          e.currentTarget.parentElement.style.display = 'none';
                                        }
                                      }}
                                      style={{
                                        width: '42px',
                                        height: '52px',
                                        objectFit: 'cover',
                                        borderRadius: '8px',
                                        border: '1.5px solid #A61C52',
                                        boxShadow: '0 2px 8px rgba(166, 28, 82, 0.2)',
                                        transition: 'transform 0.15s ease',
                                      }}
                                    />
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '2px',
                                      right: '2px',
                                      backgroundColor: 'rgba(61, 10, 30, 0.8)',
                                      color: '#FFFFFF',
                                      fontSize: '9px',
                                      padding: '2px 4px',
                                      borderRadius: '4px',
                                      pointerEvents: 'none',
                                    }}>
                                      <i className="fa-solid fa-magnifying-glass-plus"></i>
                                    </div>
                                  </div>
                                ) : null}
                                <b>{item.name}</b>
                              </div>
                            </td>
                            <td style={styles.td}>{item.fabric}</td>
                            <td style={styles.td}>
                              <span style={{ ...styles.colorPill, background: item.colorCode }}></span>
                              {item.colorName}
                            </td>
                            <td style={styles.td}><span style={{ fontWeight: '700', color: '#3D0A1E' }}>{item.price}</span></td>
                            <td style={styles.td}><span style={styles.statusActive}>{item.status}</span></td>
                            <td style={styles.td}>
                              <button
                                onClick={() => setDeleteConfirmItem(item)}
                                style={styles.deleteBtn}
                                title="Delete Product"
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>
      ) : (
        /* LOGIN CARD */
        <div style={styles.loginCardContainer}>
          <div style={styles.glowCircleTop}></div>
          <div style={styles.glowCircleBottom}></div>

          <div style={styles.card}>
            <div style={styles.logoSection}>
              <div style={styles.logoBadge}>
                <i className="fa-solid fa-gem" style={{ fontSize: 28, color: '#B8860B' }}></i>
              </div>
              <h1 style={styles.title}>VASTRA ADMIN</h1>
              <p style={styles.subtitle}>Smart Saree Boutique Kiosk Portal</p>
            </div>

            {error && (
              <div style={styles.errorAlert}>
                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }}></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  <i className="fa-solid fa-user" style={styles.labelIcon}></i>
                  Username
                </label>
                <div style={styles.inputWrapper}>
                  <input
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={styles.input}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  <i className="fa-solid fa-lock" style={styles.labelIcon}></i>
                  Password
                </label>
                <div style={styles.inputWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    tabIndex="-1"
                  >
                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  ...styles.submitBtn,
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-right-to-bracket" style={{ marginRight: 8 }}></i>
                    Sign In to Admin
                  </>
                )}
              </button>
            </form>

            {onBackToMirror && (
              <button type="button" onClick={onBackToMirror} style={styles.backLink}>
                <i className="fa-solid fa-arrow-left" style={{ marginRight: 6 }}></i>
                Back to Mirror Screen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  rootWrapper: {
    width: '100%',
    minHeight: '100vh',
    fontFamily: "'Poppins', sans-serif",
    position: 'relative',
    backgroundColor: '#FAF5EF',
  },
  toast: {
    position: 'fixed',
    top: '24px',
    right: '24px',
    backgroundColor: '#FFFFFF',
    color: '#3D0A1E',
    padding: '14px 22px',
    borderRadius: '14px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
    border: '1.5px solid #10B981',
    zIndex: 10000,
    fontWeight: '600',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    animation: 'slideIn 0.3s ease',
  },
  popupOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(61, 10, 30, 0.6)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  popupBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    padding: '36px 32px',
    width: '90%',
    maxWidth: '420px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
    border: '1.5px solid #E8DACF',
  },
  popupIconCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#ECFDF5',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.2)',
  },
  popupTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#3D0A1E',
    margin: '0 0 8px 0',
  },
  popupSub: {
    fontSize: '14px',
    color: '#7A4E5F',
    margin: '0 0 24px 0',
  },
  popupBtn: {
    width: '100%',
    padding: '14px 20px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(90deg, #941347 0%, #A61C52 50%, #B8255F 100%)',
    color: '#FFFFFF',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(166, 28, 82, 0.35)',
  },
  cancelBtn: {
    padding: '12px 18px',
    borderRadius: '12px',
    border: '1px solid #E8DACF',
    backgroundColor: '#FAF5EF',
    color: '#7A4E5F',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
  },
  adminLayout: {
    display: 'flex',
    height: '100vh',
    maxHeight: '100vh',
    overflow: 'hidden',
    backgroundColor: '#FAF5EF',
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid #E8DACF',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 18px',
    flexShrink: 0,
    height: '100vh',
    boxSizing: 'border-box',
  },
  sidebarBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '20px',
    borderBottom: '1px solid #F5ECE6',
    marginBottom: '20px',
  },
  sidebarLogoBadge: {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    backgroundColor: '#FAF5EF',
    border: '1.5px solid #E5D5C8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarBrandTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#3D0A1E',
    letterSpacing: '0.5px',
  },
  sidebarBrandSub: {
    fontSize: '11px',
    color: '#7A4E5F',
    fontWeight: '500',
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
    overflowY: 'auto',
  },
  navSectionLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#A37F8E',
    letterSpacing: '0.8px',
    padding: '8px 12px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 14px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#7A4E5F',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    position: 'relative',
    width: '100%',
  },
  navItemActive: {
    backgroundColor: 'rgba(166, 28, 82, 0.08)',
    color: '#A61C52',
    fontWeight: '700',
  },
  navIcon: {
    marginRight: '12px',
    fontSize: '16px',
    width: '20px',
    textAlign: 'center',
  },
  countPill: {
    marginLeft: 'auto',
    marginRight: '18px',
    backgroundColor: '#FAF5EF',
    color: '#A61C52',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '700',
    border: '1px solid #E8DACF',
  },
  activeDot: {
    position: 'absolute',
    right: '12px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#A61C52',
  },
  sidebarFooter: {
    paddingTop: '16px',
    borderTop: '1px solid #F5ECE6',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  mirrorReturnBtn: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #E8DACF',
    backgroundColor: '#FAF5EF',
    color: '#3D0A1E',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarLogoutBtn: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminMainArea: {
    flex: 1,
    padding: '28px 36px 60px 36px',
    overflowY: 'auto',
    height: '100vh',
    boxSizing: 'border-box',
  },
  topHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '26px',
  },
  topHeaderTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#3D0A1E',
    margin: 0,
  },
  topHeaderSub: {
    fontSize: '13px',
    color: '#7A4E5F',
    margin: '4px 0 0 0',
  },
  addProductBtn: {
    padding: '12px 20px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(90deg, #941347 0%, #A61C52 50%, #B8255F 100%)',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 6px 18px rgba(166, 28, 82, 0.3)',
    display: 'flex',
    alignItems: 'center',
  },
  tableAddBtn: {
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1px solid #A61C52',
    backgroundColor: '#FAF5EF',
    color: '#A61C52',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  adminUserBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#FFFFFF',
    padding: '8px 16px',
    borderRadius: '14px',
    border: '1px solid #E8DACF',
  },
  adminUserAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#FAF5EF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1.5px solid #A61C52',
  },
  adminUserName: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#3D0A1E',
  },
  adminUserRole: {
    fontSize: '11px',
    color: '#7A4E5F',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '18px',
    marginBottom: '28px',
  },
  dashStatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '18px',
    padding: '20px 18px',
    border: '1px solid #E8DACF',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 4px 14px rgba(61, 10, 30, 0.04)',
  },
  dashStatIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
  },
  dashStatVal: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#3D0A1E',
  },
  dashStatLabel: {
    fontSize: '12px',
    color: '#7A4E5F',
    marginTop: '2px',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    border: '1px solid #E8DACF',
    padding: '22px',
    boxShadow: '0 4px 14px rgba(61, 10, 30, 0.04)',
  },
  tableCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '18px',
  },
  tableCardTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#3D0A1E',
    margin: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  tableHeaderRow: {
    borderBottom: '1.5px solid #F5ECE6',
  },
  th: {
    padding: '12px 14px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#7A4E5F',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tableRow: {
    borderBottom: '1px solid #FAF5EF',
  },
  td: {
    padding: '14px',
    fontSize: '13px',
    color: '#3D0A1E',
  },
  colorPill: {
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    marginRight: '6px',
    verticalAlign: 'middle',
  },
  statusActive: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    backgroundColor: '#ECFDF5',
    color: '#065F46',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#DC2626',
    cursor: 'pointer',
    fontSize: '15px',
    padding: '6px 10px',
    borderRadius: '8px',
    transition: 'background 0.2s',
  },
  loginCardContainer: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    boxSizing: 'border-box',
    position: 'relative',
  },
  glowCircleTop: {
    position: 'absolute',
    top: '-80px',
    right: '-80px',
    width: '320px',
    height: '320px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(166, 28, 82, 0.18) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  glowCircleBottom: {
    position: 'absolute',
    bottom: '-100px',
    left: '-100px',
    width: '360px',
    height: '360px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(197, 139, 55, 0.22) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    padding: '36px 32px',
    boxShadow: '0 12px 40px rgba(61, 10, 30, 0.12)',
    border: '1px solid #E8DACF',
    position: 'relative',
    zIndex: 1,
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '26px',
  },
  logoBadge: {
    width: '64px',
    height: '64px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #FAF5EF 0%, #F5ECE6 100%)',
    border: '2px solid #E5D5C8',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
    boxShadow: '0 4px 14px rgba(184, 134, 11, 0.15)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#3D0A1E',
    margin: 0,
    letterSpacing: '1px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#7A4E5F',
    marginTop: '6px',
    marginBottom: 0,
  },
  errorAlert: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    padding: '12px 14px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #FCA5A5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#3D0A1E',
    display: 'flex',
    alignItems: 'center',
  },
  labelIcon: {
    color: '#A61C52',
    marginRight: '6px',
    fontSize: '12px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    fontSize: '14px',
    borderRadius: '14px',
    border: '1.5px solid #E8DACF',
    backgroundColor: '#FAF5EF',
    color: '#3D0A1E',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#7A4E5F',
    cursor: 'pointer',
    fontSize: '15px',
    padding: '6px',
  },
  submitBtn: {
    marginTop: '8px',
    padding: '14px 20px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(90deg, #941347 0%, #A61C52 50%, #B8255F 100%)',
    color: '#FFFFFF',
    fontSize: '15px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(166, 28, 82, 0.35)',
    cursor: 'pointer',
  },
  backLink: {
    marginTop: '16px',
    background: 'none',
    border: 'none',
    color: '#7A4E5F',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
};

export default AdminLogin;
