import { MdCall, MdCheck, MdEdit, MdEmail, MdEvent, MdMessage, MdMoreHoriz } from "react-icons/md";

const typeIcons = { Call: MdCall, WhatsApp: MdMessage, Email: MdEmail, Meeting: MdEvent, Other: MdMoreHoriz };

const formatDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const FollowUpCard = ({ item, onComplete, onEdit, onCancel }) => {
  const Icon = typeIcons[item.type] || MdMoreHoriz;
  const isPending = item.status === "Pending";
  return (
    <article className={`follow-up-card ${item.status !== "Pending" ? "follow-up-card-muted" : ""}`}>
      <div className="follow-up-card-date"><strong>{formatDate(item.scheduledDate)}</strong><span>{item.scheduledTime}</span></div>
      <div className="follow-up-card-icon"><Icon size={19} /></div>
      <div className="follow-up-card-body"><div className="follow-up-card-top"><div><h3>{item.leadId?.name || "Unknown lead"}</h3><p>{item.leadId?.company || ""}</p></div><span className={`follow-up-status follow-up-status-${item.status.toLowerCase()}`}>{item.status}</span></div><p className="follow-up-type"><Icon size={15} /> {item.type}</p>{item.note && <p className="follow-up-note">{item.note}</p>}</div>
      {isPending && <div className="follow-up-card-actions"><button type="button" onClick={() => onComplete(item)} className="follow-up-complete"><MdCheck size={16} /> Complete</button><button type="button" onClick={() => onEdit(item)} className="follow-up-edit"><MdEdit size={15} /> Edit</button><button type="button" onClick={() => onCancel(item)} className="follow-up-cancel">Cancel</button></div>}
    </article>
  );
};

export default FollowUpCard;
