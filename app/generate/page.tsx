export default function GeneratePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        
        <h1 className="text-3xl font-bold mb-2">
          Generate a Custom Proposal
        </h1>

        <p className="text-gray-600 mb-6">
          Paste the client job description or website below.
        </p>

        {/* Input */}
        <textarea
          placeholder="Paste client job post or website text here..."
          className="w-full h-40 border border-gray-300 rounded-md p-4 mb-4 focus:outline-none focus:ring-2 focus:ring-black"
        />

        {/* Role Selector */}
        <select className="w-full border border-gray-300 rounded-md p-3 mb-6">
          <option value="">Select your role</option>
          <option>Software Developer</option>
          <option>Designer</option>
          <option>Marketer</option>
          <option>Consultant</option>
          <option>Writer</option>
        </select>

        {/* Button */}
        <button className="w-full bg-black text-white py-3 rounded-md text-lg">
          Generate Proposal
        </button>

      </div>
    </main>
  );
}
