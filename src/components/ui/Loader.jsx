const Loader = ({ text = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-dark-200"></div>
        <div className="w-12 h-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin absolute inset-0"></div>
      </div>
      <p className="mt-4 text-dark-500 font-medium animate-pulse-soft">{text}</p>
    </div>
  );
};

export default Loader;
