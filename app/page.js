export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⏳</span>
          <span className="text-xl font-semibold text-amber-900">TimeCapsule</span>
        </div>
        <a href="/login" className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-full text-sm font-medium transition">
          Get Started
        </a>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="text-amber-600 font-medium mb-4">For parents. For children. For the future.</p>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Leave a message for<br />the moments that matter
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Record a video, voice note, or write a letter — and deliver it to your child 
          exactly when they need it most. On their 18th birthday. Their wedding day. Whenever you choose.
        </p>
        <div className="flex gap-4 justify-center">
          <a href="/login" className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-full text-lg font-medium transition">
            Create your first capsule
          </a>
          <button className="border border-gray-300 hover:border-gray-400 text-gray-600 px-8 py-4 rounded-full text-lg transition">
            See how it works
          </button>
        </div>
      </main>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center p-6">
          <div className="text-4xl mb-4">🎥</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Video, audio or text</h3>
          <p className="text-gray-500 text-sm">Record yourself speaking, upload a voice note, or write a heartfelt letter.</p>
        </div>
        <div className="text-center p-6">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Locked until the moment</h3>
          <p className="text-gray-500 text-sm">Your message stays sealed. It only opens on the date you choose — not a day earlier.</p>
        </div>
        <div className="text-center p-6">
          <div className="text-4xl mb-4">💌</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Delivered automatically</h3>
          <p className="text-gray-500 text-sm">We send it by email on the right day. You don't need to remember anything.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 text-sm">
        © 2025 TimeCapsule · Made with love for families
      </footer>

    </div>
  )
}