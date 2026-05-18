import React from 'react';

interface EmptyStateProps {
  icon: React.ElementType | React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const renderIcon = () => {
    if (!icon) return null;
    // If it's a valid React element (pre-rendered JSX), render it directly
    if (React.isValidElement(icon)) {
      return icon;
    }
    // If it's a component (function or class), render it as a component
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in (icon as object))) {
      const IconComponent = icon as React.ElementType;
      return <IconComponent size={24} className="text-primary/60" />;
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-xl bg-primary/8 flex items-center justify-center mb-4">
        {renderIcon()}
      </div>
      <h3 className="text-[15px] font-600 text-foreground mb-1.5">{title}</h3>
      <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-4 py-2 bg-primary text-white text-[13px] font-500 rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}