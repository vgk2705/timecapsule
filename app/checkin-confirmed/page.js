export default function CheckinConfirmed() {
  return (
    <div className="min-h-screen bg-purple-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">💜</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Thank you!</h1>
        <p className="text-gray-500 mb-2">We're glad you're still with us.</p>
        <p className="text-gray-500 mb-8">Your legacy capsules are safely stored. We'll check in again in 6 months.</p>
        <a href="/dashboard"
          className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-semibold transition">
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}