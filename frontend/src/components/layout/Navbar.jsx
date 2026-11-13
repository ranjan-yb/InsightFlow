import { Menu, LogOut, UserCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const Navbar = ({ setOpen }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">

      <div className="flex items-center gap-4">
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={23} />
        </button>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Workspace
          </h2>
          <p className="hidden text-xs text-slate-500 sm:block">
            Manage and analyze your datasets
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">

        <div className="hidden items-center gap-2 sm:flex">
          <UserCircle size={25} className="text-slate-500" />

          <div>
            <p className="text-sm font-semibold text-slate-800">
              {user?.username}
            </p>
            <p className="text-xs text-slate-500">
              {user?.email}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={17} />
          <span className="hidden sm:block">Logout</span>
        </button>

      </div>
    </header>
  );
};

export default Navbar;