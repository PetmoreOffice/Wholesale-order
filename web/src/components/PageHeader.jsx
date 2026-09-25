import React from 'react';

export function PageHeader({ title, description, actions, children }) {
  return (
    <header className="page-header">
      <div className="page-heading">
        {children}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
