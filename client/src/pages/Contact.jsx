import Navebar from "../components/Navebar";

const Contact = () => {
  return (
    <div className="min-h-screen bg-[#0a0714] text-white">
      <Navebar />
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-purple-950/30 backdrop-blur-md">
            <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Contact</p>
            <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Let's talk about your leads.</h1>
            <p className="mt-4 text-base text-white/70 sm:text-lg">
              Need help setting up your CRM, integrating with your sales process, or importing leads? Reach out and we will assist you quickly.
            </p>

            <div className="mt-10 space-y-6">
              <div className="rounded-3xl border border-white/10 bg-[#090516] p-5">
                <p className="text-sm text-white/60">Email</p>
                <p className="mt-2 font-semibold">support@leadflowcrm.com</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[#090516] p-5">
                <p className="text-sm text-white/60">Phone</p>
                <p className="mt-2 font-semibold">+91 98765 43210</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[#090516] p-5">
                <p className="text-sm text-white/60">Office</p>
                <p className="mt-2 font-semibold">Mumbai, India</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-purple-950/30 backdrop-blur-md">
            <h2 className="text-3xl font-bold">Send a message</h2>
            <p className="mt-3 text-white/70">We’ll respond within one business day.</p>

            <form className="mt-8 space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/70">Name</label>
                <input className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0f0b22] px-4 py-3 text-white outline-none focus:border-purple-400" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70">Email</label>
                <input className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0f0b22] px-4 py-3 text-white outline-none focus:border-purple-400" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70">Message</label>
                <textarea className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0f0b22] px-4 py-3 text-white outline-none focus:border-purple-400" rows="5" placeholder="How can we help?" />
              </div>
              <button className="inline-flex w-full items-center justify-center rounded-2xl bg-[#d9ff00] px-5 py-3 text-sm font-semibold text-[#02030a] transition hover:opacity-90">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
