import { useEffect, useRef, useState } from 'react';

export interface MenuItem {
  label: string;
  icon?: string;
  disabled?: boolean;
  separator?: boolean;
  onClick: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  // Clamp to viewport after first render
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const left = x + rect.width > window.innerWidth ? window.innerWidth - rect.width - 4 : x;
    const top = y + rect.height > window.innerHeight ? window.innerHeight - rect.height - 4 : y;
    setPosition({ left: Math.max(0, left), top: Math.max(0, top) });
  }, [x, y]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: position.left, top: position.top }}
    >
      {items.map((item) => (
        <div key={item.label}>
          {item.separator && <div className="context-menu-separator" />}
          <button
            className={`context-menu-item${item.disabled ? ' context-menu-item-disabled' : ''}`}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
          >
            {item.icon && <span className="context-menu-icon">{item.icon}</span>}
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}
