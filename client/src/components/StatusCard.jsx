const StatusCard = ({ header, value, description, icon }) => {
  return (
    <div className="group relative bg-white/3 border border-purple-500/20 rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10">
      {/* Hover glow bg */}
      <div className="absolute inset-0 bg-linear-to-r from-purple-500/5 to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Bottom line animation */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-purple-500 to-yellow-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

      {/* Icon */}
      <div className="relative z-10 w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xl mb-4 group-hover:border-yellow-400/30 transition-colors duration-300">
        {icon}
      </div>

      {/* Header */}
      <p className="relative z-10 font-mono text-[10px] tracking-[0.25em] text-purple-400 uppercase mb-1.5">
        {header}
      </p>

      {/* Value */}
      <p className="relative z-10 text-3xl font-extrabold font-mono tracking-tight text-transparent bg-clip-text bg-linear-to-r from-purple-700 to-yellow-300 mb-2">
        {value}
      </p>

      {/* Description */}
      <p className="relative z-10 text-xs text-white/35 leading-relaxed">
        {description}
      </p>
    </div>
  );
};
  
export default StatusCard;
