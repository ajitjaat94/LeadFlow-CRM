const LeadTable = ({ leads }) => {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Leads Table</h2>

      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">Name</th>
            <th className="py-2 px-4 border-b">Company</th>
            <th className="py-2 px-4 border-b">Email</th>
            <th className="py-2 px-4 border-b">Phone</th>
            <th className="py-2 px-4 border-b">Status</th>
            <th className="py-2 px-4 border-b">Action</th>
          </tr>
        </thead>

        <tbody>
          {leads.map((lead) => (
            <tr key={lead._id}>
              <td className="py-2 px-4 border-b">{lead.name}</td>
              <td className="py-2 px-4 border-b">{lead.company}</td>
              <td className="py-2 px-4 border-b">{lead.email}</td>
              <td className="py-2 px-4 border-b">{lead.phone}</td>
              <td className="py-2 px-4 border-b">{lead.status}</td>
              <td className="py-2 px-4 border-b">
                <button className="bg-blue-500 text-white px-3 py-1 rounded">
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeadTable;