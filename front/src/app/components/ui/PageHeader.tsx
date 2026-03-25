import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle: string;
  rightContent?: ReactNode;
  className?: string;
};

export default function PageHeader({
  title,
  subtitle,
  rightContent,
  className = "",
}: PageHeaderProps) {
  return (
    <header
      className={`bg-blue-800 text-white px-10 py-8 flex items-center justify-between ${className}`}
    >
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-blue-100 mt-2 text-sm">{subtitle}</p>
      </div>

      {rightContent}
    </header>
  );
}
