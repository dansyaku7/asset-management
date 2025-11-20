export default function Loading() {
  // Komponen ini akan otomatis ditampilkan oleh Next.js
  // saat halaman di dalam folder 'dashboardAsset' sedang memuat data.
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] animate-pulse">
      <div 
        className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-[#01449D]"
        // Style border-top-color sengaja dibuat transparan untuk efek 'pac-man'
        style={{ borderTopColor: 'transparent' }} 
      >
      </div>
      <p className="mt-4 text-lg font-semibold text-gray-700 tracking-wider">
        Memuat Halaman...
      </p>
    </div>
  );
}
