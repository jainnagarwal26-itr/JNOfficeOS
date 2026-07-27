import React from "react";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
}

/**
 * WorkspaceLayout establishes the formal Enterprise Layout Contract.
 * 
 * DESIGN PRINCIPLES:
 * 1. Single layout ownership: App.tsx hosts the main viewport canvas, including
 *    outer padding (p-4 md:p-8), scrolling (overflow-y-auto max-h-[calc(100vh-62px)]),
 *    and max-width limits (max-w-7xl mx-auto).
 * 2. Modules using this component MUST NOT define page-level paddings, scrolling mechanics,
 *    viewport height overrides, or layout container width constraints.
 * 3. Standard spacing (space-y-6) is applied between top-level visual cards/widgets.
 */
export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  children,
  id,
  className = "",
}) => {
  return (
    <div 
      id={id} 
      className={`space-y-6 ${className}`}
    >
      {children}
    </div>
  );
};
