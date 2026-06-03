import { GiHamburgerMenu } from "react-icons/gi";
import { CgProfile } from "react-icons/cg";

const Navebar = () => {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-gray-800 text-white shadow-md">
      {/* Logo */}
      <h1 className="text-xl font-bold tracking-wide">Leadflow CRM</h1>

      {/* Right Section */}
      <div className="flex items-center gap-6">
        <span className="flex items-center gap-2 cursor-pointer hover:text-purple-400 transition-colors">
          <GiHamburgerMenu size={18} />
          <span className="font-medium">Dashboard</span>
        </span>

        <span className="cursor-pointer p-2 rounded-full hover:bg-gray-700 transition-colors">
          <CgProfile size={22} />
        </span>
      </div>
    </div>
  );
};
export default Navebar;
