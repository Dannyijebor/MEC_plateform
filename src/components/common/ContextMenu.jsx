import React, { useEffect, useRef } from 'react';

const ContextMenu = ({ x, y, onEdit, onDelete, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  const menuStyle = {
    position: 'fixed',
    top: Math.min(y, window.innerHeight - 100) + 'px',
    left: Math.min(x, window.innerWidth - 150) + 'px',
    zIndex: 1000,
  };

  return (
    <div ref={menuRef} style={menuStyle} className="context-menu-popup" onContextMenu={(e) => e.preventDefault()}>
      <button className="menu-item edit" onClick={(e) => { e.stopPropagation(); onEdit(); onClose(); }}>✏️ Edit</button>
      <button className="menu-item delete" onClick={(e) => { e.stopPropagation(); onDelete(); onClose(); }}>🗑️ Delete</button>
    </div>
  );
};
export default ContextMenu;
