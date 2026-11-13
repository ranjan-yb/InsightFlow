import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";

const DashboardLayout = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">

      <Sidebar open={open} setOpen={setOpen} />

      <div className="min-h-screen lg:ml-64">

        <Navbar setOpen={setOpen} />

        <main className="p-5 sm:p-8">
          <Outlet />
        </main>

      </div>
    </div>
  );
};

export default DashboardLayout;