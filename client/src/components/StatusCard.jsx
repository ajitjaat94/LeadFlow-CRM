const StatusCard = ({ header, value, description, icon }) => {
  return (
    <div className="bg-white shadow-md hover:shadow-lg transition-all duration-300 rounded-xl p-5 w-full border border-gray-100">
      <div className="text-purple-600 text-2xl mb-3">{icon}</div>

      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
        {header}
      </h3>

      <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>

      <p className="text-sm text-gray-500 mt-2">{description}</p>
    </div>
  );
};
  
export default StatusCard;
