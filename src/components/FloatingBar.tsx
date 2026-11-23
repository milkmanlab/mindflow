import React from 'react';

/**
 * 画面の端に浮くバー（上のバー・右下のバー）の外枠。
 * 面・境界・影・角丸をそろえるため、浮くバーはこの部品を使う。位置は className で渡す
 */
export const FloatingBar: React.FC<{
  id?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ id, className = '', children }) => (
  <div
    id={id}
    className={`bg-surface rounded-panel shadow-float border border-line p-1.5 flex items-center gap-1 select-none ${className}`}
  >
    {children}
  </div>
);
