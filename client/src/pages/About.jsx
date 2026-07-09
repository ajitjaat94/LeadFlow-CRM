import Navebar from "../components/Navebar";

const About = () => {
  return (
    <div className="min-h-screen bg-[#070411] text-white">
      <Navebar />
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-20">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-purple-950/30 backdrop-blur-md">
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
            Built for teams that want sales clarity.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/75">
            LeadFlow CRM is designed to help small teams manage leads faster,
            reduce follow-up friction, and move prospects through the pipeline
            with confidence.
          </p>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-[#090516] p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-purple-300">
                Focus
              </p>
              <p className="mt-3 text-white/70">
                Keep all your leads in one place and never lose track of the
                next step.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#090516] p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-purple-300">
                Speed
              </p>
              <p className="mt-3 text-white/70">
                Quick add, edit, and review workflows for sales activity without
                complexity.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#090516] p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-purple-300">
                Control
              </p>
              <p className="mt-3 text-white/70">
                User-specific data and secure access make every lead private to
                the right team member.
              </p>
            </div>
          </div>

          <div className="mt-12 rounded-[1.75rem] border border-purple-500/20 bg-purple-500/5 p-8">
            <h2 className="text-2xl font-semibold">Our mission</h2>
            <p className="mt-3 text-white/70 leading-7">
              We want every small business to get a modern lead workflow without
              the complexity. This app is built to help you close more deals
              with less effort.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
