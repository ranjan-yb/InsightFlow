import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Database,
  Upload,
  ChartNoAxesCombined,
  Brush,
  FileText,
  X,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Datasets", path: "/datasets", icon: Database },
  { name: "Upload CSV", path: "/upload", icon: Upload },
  { name: "Analytics", path: "/analytics", icon: ChartNoAxesCombined },
  { name: "Data Cleaning", path: "/cleaning", icon: Brush },
  { name: "Reports", path: "/reports", icon: FileText },
];

const Sidebar = ({ open, setOpen }) => {
  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 text-white transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Insight<span className="text-blue-400">Flow</span>
          </h1>

          <button
            onClick={() => setOpen(false)}
            className="lg:hidden"
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-4 py-7">
          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Workspace
          </p>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/dashboard"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon size={19} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-white/10 p-5">
          <p className="text-xs text-slate-500">
            InsightFlow Analytics
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Dynamic CSV Analytics Platform
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;