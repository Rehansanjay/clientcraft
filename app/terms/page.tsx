export default function TermsPage() {
    return (
        <main className="min-h-screen px-6 py-20 bg-[var(--bg)] text-[var(--text)] font-sans">
            <div className="max-w-2xl mx-auto space-y-8">
                <h1 className="text-3xl font-semibold">Terms of Service</h1>
                <div className="space-y-4 text-[var(--muted)] leading-relaxed">
                    <p>
                        Welcome to Klynexa. By using our service, you agree to these terms.
                    </p>
                    <p>
                        1. <strong>Usage:</strong> Our AI tools are for professional use. You are responsible for the content you generate.
                    </p>
                    <p>
                        2. <strong>Accounts:</strong> You must maintain the security of your account credentials.
                    </p>
                    <p>
                        3. <strong>Liability:</strong> Klynexa is provided "as is" without warranties. We are not liable for business outcomes resulting from generated proposals.
                    </p>
                    <p>
                        Last updated: January 2026
                    </p>
                </div>
            </div>
        </main>
    );
}
