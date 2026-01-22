export default function PrivacyPage() {
    return (
        <main className="min-h-screen px-6 py-20 bg-[var(--bg)] text-[var(--text)] font-sans">
            <div className="max-w-2xl mx-auto space-y-8">
                <h1 className="text-3xl font-semibold">Privacy Policy</h1>
                <div className="space-y-4 text-[var(--muted)] leading-relaxed">
                    <p>
                        Your privacy is important to us. Here is how we handle your data.
                    </p>
                    <p>
                        1. <strong>Data Collection:</strong> We collect inputs you provide to generate proposals and basic account information.
                    </p>
                    <p>
                        2. <strong>Usage:</strong> We use your data securely to provide AI services. We do not sell your personal data.
                    </p>
                    <p>
                        3. <strong>Security:</strong> We implement industry-standard security measures to protect your information.
                    </p>
                    <p>
                        Last updated: January 2026
                    </p>
                </div>
            </div>
        </main>
    );
}
