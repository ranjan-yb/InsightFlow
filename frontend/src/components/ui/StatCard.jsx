import { ArrowUpRight } from "lucide-react";

const StatCard = ({ title, value, icon: Icon, description }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
          <Icon size={20} />
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <h3 className="text-2xl font-bold text-slate-900">
          {value ?? 0}
        </h3>

        <ArrowUpRight size={18} className="text-slate-400" />
      </div>

      <p className="mt-2 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
};

export default StatCard;