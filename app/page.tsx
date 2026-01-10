export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold mb-4">
        Win clients with custom proposals
      </h1>

      <p className="text-lg text-gray-600 max-w-xl mb-8">
        Paste any job post or client website and get a personalized proposal
        you can send in minutes.
      </p>

      <button className="bg-black text-white px-6 py-3 rounded-md text-lg">
        Generate Proposal
      </button>
    </main>
  );
}
